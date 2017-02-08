/*
    enhanced-burnup.js:  
    
    MIT License:
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
 */

if (typeof require === 'function') {
    var RallyAPI = require('../../js/rally.js');
    var $ = require('jquery');
    var Chart = require('chart.js');
    var extrapolate = require('extrapolate');
}

function EnhancedBurnupChart() {

    var rally = new RallyAPI();
    var selectedProject = null;
    var selectedRelease = null;
    var type = 'ALL';
    
    var chart = undefined;

    this.updateReleases = updateReleases;
    this.extrapolateBurnup = extrapolateBurnup;
    this.buildChartJS = buildChartJS;
    this.updateChart = updateChart;
    this.init = init;

    function updateReleases(projectId) {
        rally.getProject(projectId).then(function(prj) {
            rally.getReleasesForProject(prj).then(function(releases) {
                prj.Releases = releases;
                $.when.apply(null, rally.hydrateReleases(prj.Releases)).then(function() {
                    var relSelect = $('#selectRelease');
                    relSelect.change(function() {
                        var sr = $('#selectRelease option:selected');
                        if (sr.val() === 'ALL' || sr.val() === 'NONE') {
                            selectedRelease = null;
                            type = sr.val();
                        }
                        else
                            rally.getRelease(sr.val()).then(function(r) {
                                selectedRelease = r;
                            });
                        updateChart(selectedProject);
                    });
                    relSelect.empty();
                    selectedRelease = null;
                    if (prj.Releases.length > 1) {
                        relSelect.append($('<option></option>').val('ALL').html('ALL RELEASES')).prop('selected', true);
                    }
                    prj.Releases.forEach(function(release, i) {
                        relSelect.append($('<option></option>').val(release.ObjectID).html(release.Name));
                    });
                    //relSelect.append($('<option></option>').val('NONE').html('NO RELEASE ASSIGNED'));
                });
            });
        });
    }
    
    function averageVelocity(chartValues, iterations ){
        var actives =
            iterations.filter(function(s) {
                return new Date(s.EndDate) <= new Date();
            }).map(function(sp) {
                return chartValues[sp.Name].accepted;
            });
            
            var sum = actives.reduce(function (p, c ) {
                return p + c;
            });
            
            return { mean: sum / actives.length, last: actives[actives.length-1] };
    }

    /**
     * Extrapolates the line required to get to 100% BV using simple linear extrapolation
     * Note that we need at least 2 points to successfuly extrapolate the data, we'll
     * fail silently if this isnt the case - and no projections will be displayed
     */
    function extrapolateBurnup(chartValues, iterations) {


    
        
        var cumulatives =
            iterations.filter(function(s) {
                return new Date(s.EndDate) <= new Date();
            })
            .map(function(sp) {
                return chartValues[sp.Name].c_accepted;
            });

        var aV = averageVelocity( chartValues, iterations);
        
        $('#velocityTrend').html( 'Mean Velocity: ' + aV.mean + ((aV.last > aV.mean)? '<span style="color: green">&#x25B2;</span>' : (aV.last < aV.mean)? '<span style="color: red">&#x25BC;</span>' : ''));

        var ex = new extrapolate();


        cumulatives.forEach(function(a, i) {
            ex.given(i, a);
        });

        var ext = cumulatives.map(function(c, i) {
            return (i === cumulatives.length - 1) ? Math.roundx(cumulatives[cumulatives.length - 1]) : undefined;
        });

        for (var idx = cumulatives.length; idx < iterations.length; idx++)
            ext.push(Math.roundx(ex.getLinear(idx)));
        return ext;

    }

    /**
     * Build the actual chart from the data; uses Chart.js.
     * 
     */
    function buildChartJS(chartValues, prj, iterations) {

        var maxPlanned = Object.keys(chartValues).map(function(e) {
            return chartValues[e].c_planned;
        }).max();


        if (maxPlanned <= 0) {
            $("#myChart").hide();
            $("#noData").show();
        }
        else {
            var options = {
                title: {
                    display: true,
                    text: 'Enhanced Release Burn Up\nfor ' + prj.Description + ' (' + prj._refObjectName + ')',
                    fontSize: 16
                },
                scales: {
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Story Points'
                        }
                    }],
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Iteration'
                        }
                    }]
                },
                maintainAspectRatio: false,
                layout: {
                    padding: 10
                },
                hover: { mode: 'x' },
                tooltips: {
                    mode: 'x',
                    callbacks: {
                        label(tooltipItem, data) {
                            var dataset = data.datasets[tooltipItem.datasetIndex];
                            return ' ' + dataset.label + ': ' + dataset.data[tooltipItem.index] + ' Points';
                        }
                    }

                }
            };

            var data = {
                labels: Object.keys(chartValues),
                datasets: [{
                        label: 'Accepted',
                        data: Object.keys(chartValues).map(function(e) {
                            return chartValues[e].c_accepted;
                        }),
                        type: 'line',
                        startAtZero: true,
                        fill: true,
                        lineTension: 0,
                        borderColor: '#3465AA',
                        backgroundColor: 'rgba(52, 101, 170, 0.3)',
                        pointBorderColor: '#3465AA',
                        pointBackgroundColor: '#3465AA'
                    }, 
                    {
                        label: 'Projected',
                        data: extrapolateBurnup(chartValues, iterations),
                        type: 'line',
                        startAtZero: true,
                        fill: false,
                        lineTension: 0,
                        borderWidth: 1,
                        borderDash: [5, 3],
                        borderColor: 'black',
                        backgroundColor: 'black',
                        pointBorderColor: 'black',
                        pointBackgroundColor: 'black'
                    },
                    {
                        label: "Planned",
                        data: Object.keys(chartValues).map(function(e) {
                            return chartValues[e].c_planned;
                        }),
                        backgroundColor: '#E8D7AB',
                    } 

                ]
            };

            var ctx = $("#myChart");
            ctx.show();
            $("#noData").hide();

            if( chart ) chart.destroy();
            
            chart = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
        }
    }

    function acceptedIn(story, iterations) {
        var lastIterationName = "UNASSIGNED";
        var storyAcceptedDate = new Date(story.AcceptedDate);
        var storyCompleted = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed' && story.AcceptedDate);
        if (storyCompleted) {
            iterations.forEach(function(iteration) {
                if (storyAcceptedDate >= new Date(iteration.StartDate) && storyAcceptedDate <= new Date(iteration.EndDate))
                    lastIterationName = iteration.Name;
            });
        }
        return lastIterationName;
    }

    /**
     * Build the chart data for a set of user stories for a given field name
     */
    function buildChartData(userStories, iterations) {
        var iterHash = {};

        iterations.sort(function(a, b) {
            var aD = new Date(a.StartDate);
            var bD = new Date(b.StartDate);
            return (aD < bD) ? -1 :
                (aD > bD) ? 1 : 0;
        });


        iterations.forEach(function(iteration) {
            iterHash[iteration.Name] = {
                start: new Date(iteration.StartDate),
                end: new Date(iteration.EndDate),
                accepted: 0,
                planned: 0,
                c_accepted: 0,
                c_planned: 0
            };
        });

        // build actuals/planned
        userStories.forEach(function(story) {
            var iterationName = (story.Iteration) ? story.Iteration.Name : 'UNASSIGNED';
            var storyCompleted = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed') ? 1 : 0;
            if (storyCompleted ) {
                var acceptedIter = acceptedIn(story, iterations);
                if (iterHash[acceptedIter])
                    iterHash[acceptedIter].accepted += story.PlanEstimate;
            }
            if( story.Iteration ) iterHash[iterationName].planned += story.PlanEstimate;
        });

        // build cumulatives
        var lastKey = undefined;



        iterations.map(function(i) {
            return i.Name;
        }).forEach(function(iteration) {
            var lastValue = (lastKey) ? iterHash[lastKey] : {
                accepted: 0,
                planned: 0,
                c_accepted: 0,
                c_planned: 0
            };
            iterHash[iteration].c_accepted += (iterHash[iteration].end <= new Date() ) ? lastValue.c_accepted + iterHash[iteration].accepted : undefined;
            iterHash[iteration].c_planned += lastValue.c_planned + iterHash[iteration].planned;
            lastKey = iteration;
        });

        return iterHash;
    }


    function updateChart(projectId) {
        rally.getProject(projectId).then(function(prj) {
            rally.getStoriesForProject(prj).then(function(stories) {
                //TODO: filter stories by release
                if (selectedRelease) {
                    stories = stories.filter(function(story) {
                        return (story.Release && story.Release._ref === selectedRelease._ref);
                    });
                }

                rally.getIterationsForProject(prj).then(function(iters) {
                    $.when.apply(null, rally.hydrateIterationsForProject(iters)).then(function() {
                        $.when.apply(null, rally.hydrateIterations(stories)).then(function() {
                            var chartValues = buildChartData(stories, iters);
                            buildChartJS(chartValues, prj, iters);
                        });
                    });
                });
            });
        });

    }

    function init() {

        rally.getProjects().then(function(projectSummaries) {
            $.when.apply(null, rally.hydrateProjects(projectSummaries)).then(function() {

                var projSelect = $('#selectProject');
                projSelect.change(function() {
                    var sp = $('#selectProject option:selected');
                    selectedProject = sp.val();
                    updateChart(selectedProject);
                    updateReleases(selectedProject);
                });

                projectSummaries.forEach(function(project, i) {
                    if (i === 0) {
                        selectedProject = project.ObjectID.toString();
                        updateChart(project.ObjectID.toString());
                        updateReleases(project.ObjectID.toString());
                    }
                    projSelect.append($('<option></option>').val(project.ObjectID.toString()).html(project._refObjectName + ' - ' + project.Description));
                });

            });
        });
    }

    return this;

}

if (typeof module !== 'undefined')
    module.exports = EnhancedBurnupChart;

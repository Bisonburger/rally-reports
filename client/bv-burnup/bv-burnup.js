/*
    bv-burnup.js:  
    
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

function BVBurnupChart() {

    var column = 'c_BizValue';
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

    /**
     * Extrapolates the line required to get to 100% BV using simple linear extrapolation
     * Note that we need at least 2 points to successfuly extrapolate the data, we'll
     * fail silently if this isnt the case - and no projections will be displayed
     */
    function extrapolateBurnup(chartValues) {

        var cumulatives = Object.keys(chartValues).filter(function(s) {
            return chartValues[s].hasActuals;
        }).map(function(sp) {
            return chartValues[sp].p_actual;
        });

        var ex = new extrapolate();


        cumulatives.forEach(function(a, i) {
            ex.given(i, a);
        });

        var ext = cumulatives.map(function(c, i) {
            return (i === cumulatives.length - 1) ? Math.roundx(cumulatives[cumulatives.length - 1]) : undefined;
        });

        var len = cumulatives.length;
        do {
            var end = ex.getLinear(len);
            if (end > 100) end = 100;
            ext.push(Math.roundx(end));
            len += 1;
        } while (end !== 100 && len < 20);
        // stop when we're at 100% or after 20 added sprints

        return ext;
    }

    /**
     * Build the actual chart from the data; uses Chart.js.
     * 
     */
    function buildChartJS(chartValues, prj) {

        var maxPlanned = Object.keys(chartValues).map(function(e) {
            return chartValues[e].c_planned;
        }).max();

        if (!$('#showUnassigned').prop('checked')) {
            console.log('showUnassigned is not checked!');
            var cv = {};
            Object.keys(chartValues).filter(function(key) {
                return key !== 'UNASSIGNED';
            }).forEach(function(key) {
                cv[key] = chartValues[key];
            });
            chartValues = cv;
        }
        else {
            console.log('showUnassigned is checked!');
        }

        if (maxPlanned <= 0) {
            $("#myChart").hide();
            $("#noData").show();
        }
        else {
            var options = {
                title: {
                    display: true,
                    text: 'Business Value Burn Up\nfor ' + prj.Description + ' (' + prj._refObjectName + ')',
                    fontSize: 16
                },
                scales: {
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Business Value % Complete'
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
                tooltips: {
                    mode: 'x'
                        /*,
                        callbacks: {
                            label(tooltipItem, data) {
                                var dataset = data.datasets[tooltipItem.datasetIndex];
                                return ' ' + dataset.label + ': ' + dataset.data[tooltipItem.index] + '0%';
                            }
                        }*/

                }
            };

            var data = {
                labels: Object.keys(chartValues),
                datasets: [{
                        label: 'Actual',
                        data: Object.keys(chartValues).map(function(e) {
                            return Math.roundx(chartValues[e].p_actual);
                        }),
                        fill: true,
                        borderColor: '#3465AA',
                        backgroundColor: 'rgba(52, 101, 170, 0.3)',
                        pointBorderColor: '#3465AA',
                        pointBackgroundColor: '#3465AA'
                    },

                    {
                        label: "Planned",
                        data: Object.keys(chartValues).map(function(e) {
                            return Math.roundx(chartValues[e].p_planned);
                        }),
                        fill: false,
                        lineTension: 0,
                        borderColor: '#E8D7AB',
                        backgroundColor: '#E8D7AB',
                        pointBorderColor: '#E8D7AB',
                        pointBackgroundColor: '#E8D7AB'

                    },

                    {
                        label: 'Projected',
                        data: extrapolateBurnup(chartValues),
                        fill: false,
                        lineTension: 0,
                        borderWidth: 1,
                        borderDash: [5, 3],
                        borderColor: 'black',
                        backgroundColor: 'black',
                        pointBorderColor: 'black',
                        pointBackgroundColor: 'black'
                    }
                ]
            };

            var ctx = $("#myChart");
            ctx.show();
            $("#noData").hide();

            if (chart) chart.destroy();

            chart = new Chart(ctx, {
                type: 'line',
                data: data,
                options: options
            });
        }
    }

    /**
     * Build the chart data for a set of user stories for a given field name
     */
    function buildChartData(userStories, fieldName) {
        var iterHash = {};

        if (!fieldName) fieldName = this.summaryCol;

        // build actuals/planned
        userStories.forEach(function(story) {
            var iterationName = (story.Iteration) ? story.Iteration.Name : 'UNASSIGNED';
            if (!iterHash[iterationName])
                iterHash[iterationName] = {
                    start: (story.Iteration) ? new Date(story.Iteration.StartDate) : null,
                    end: (story.Iteration) ? new Date(story.Iteration.EndDate) : null,
                    hasActuals: (story.Iteration && new Date(story.Iteration.EndDate) <= new Date()),
                    actual: 0,
                    planned: 0,
                    c_actual: 0,
                    c_planned: 0,
                    p_actual: 0,
                    p_planned: 0
                };
            var storyCompleted = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed') ? 1 : 0;
            iterHash[iterationName].actual += storyCompleted * story[fieldName];
            iterHash[iterationName].planned += story[fieldName];
        });

        // build cumulatives
        var lastKey = undefined;
        Object.keys(iterHash).forEach(function(iteration) {
            var lastValue = (lastKey) ? iterHash[lastKey] : {
                actual: 0,
                planned: 0,
                c_actual: 0,
                c_planned: 0,
                p_actual: 0,
                p_planned: 0
            };
            iterHash[iteration].c_actual += lastValue.c_actual + iterHash[iteration].actual;
            iterHash[iteration].c_planned += lastValue.c_planned + iterHash[iteration].planned;
            lastKey = iteration;
        });

        var maxPlanned = Object.keys(iterHash).map(function(e) {
            return iterHash[e].c_planned;
        }).max();

        // build %
        Object.keys(iterHash).forEach(function(iteration) {
            iterHash[iteration].p_actual = (iterHash[iteration].hasActuals) ? iterHash[iteration].c_actual / maxPlanned * 100 : undefined;
            iterHash[iteration].p_planned = iterHash[iteration].c_planned / maxPlanned * 100;
        });

        console.log(iterHash);
        return iterHash;
    }


    function updateChart(projectId) {
        rally.getProject(projectId).then(function(prj) {
            rally.getStoriesForProject(prj).then(function(stories) {
                    //TODO: filter stories by release
                    if (selectedRelease)
                        stories = stories.filter(function(story) {
                            return (story.Release && story.Release._ref === selectedRelease._ref);
                        });
                    else {
                        if (type === 'NONE')
                            stories = stories.filter(function(story) {
                                return (!story.Release);
                            });
                    }
                    $.when.apply(null, rally.hydrateIterations(stories)).then(function() {
                        var chartValues = buildChartData(stories, column);
                        buildChartJS(chartValues, prj);
                    });
                })
                .fail(function(err) {
                    console.log(err);
                });
        });

    }

    function init() {
        $('#showUnassigned').prop('checked', true);

        rally.getProjects().then(function(projectSummaries) {
            $.when.apply(null, rally.hydrateProjects(projectSummaries)).then(function() {

                var projSelect = $('#selectProject');
                projSelect.change(function() {
                    var sp = $('#selectProject option:selected');
                    $('#showUnassigned').prop('checked', true);
                    selectedProject = sp.val();
                    updateChart(selectedProject);
                    updateReleases(selectedProject);
                });

                $("#showUnassigned").change(function() {
                    updateChart(selectedProject);
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
    module.exports = BVBurnupChart;

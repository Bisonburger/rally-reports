/* global $ Chart RallyAPI extrapolate */

var column = 'c_BizValue';
var rally = new RallyAPI();
var selectedProject = null;
var selectedRelease = null;
var type = 'ALL';


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
                if (prj.Releases.length > 1){
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

    var ext = cumulatives.map(function(c,i) {
        return (i === cumulatives.length-1)? Math.roundx(cumulatives[cumulatives.length - 1]) : undefined;
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
    
    var maxPlanned = Object.keys(chartValues).map(function(e) {return chartValues[e].c_planned;}).max();
    
    if( !$('#showUnassigned').prop( 'checked' ) ){
        console.log( 'showUnassigned is not checked!');
        var cv = {};
        Object.keys(chartValues).filter(function(key){return key !== 'UNASSIGNED' } ).forEach(function(key){ cv[key] = chartValues[key]; } );
        chartValues = cv;
    }
    else{
        console.log( 'showUnassigned is checked!');
    }
    
    if( maxPlanned <= 0 ){
        $("#myChart").hide();
        $("#noData").show();
    }else{
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
                mode: 'x',
                callbacks: {
                    label(tooltipItem, data) {
                        var dataset = data.datasets[tooltipItem.datasetIndex];
                        return ' ' + dataset.label + ': ' + dataset.data[tooltipItem.index] + '0%';
                    }
                }
    
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

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });
    }
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
                    var chartValues = rally.buildChartData(stories, column);
                    buildChartJS(chartValues, prj);
                });
            })
            .fail(function(err) {
                console.log(err);
            });
    });
}

$(function() {

    $('#showUnassigned').prop( 'checked' ,true);

    rally.getProjects().then(function(projectSummaries) {
        $.when.apply(null, rally.hydrateProjects(projectSummaries)).then(function() {
            
            var projSelect = $('#selectProject');
            projSelect.change(function() {
                var sp = $('#selectProject option:selected');
                $('#showUnassigned').prop( 'checked' ,true);
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

});

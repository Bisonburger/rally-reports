/* global $ Chart RallyAPI */

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
 * Build the actual chart from the data; uses Chart.js.
 * 
 */
function buildChartJS(chartValues, prj) {


    var options = {
        title: {
            display: true,
            text: 'Plan vs Business Value',
            fontSize: 16,
            padding: 30
        },
        legend:{
            display: false
        },
        scales: {
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Plan Estimate'
                },
                gridLines: {
                    display: true
                },
                ticks: {
                    display: false,
                    beginAtZero: true,
                    min: 0,
                    max: 1,
                    stepSize: 0.5
                }

            }],
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Business Value'
                },
                gridLines: {
                    display: true
                },
                ticks: {
                    display: false,
                    beginAtZero: true,
                    min: 0,
                    max: 1,
                    stepSize: 0.5
                }
            }]
        },
        maintainAspectRatio: false,
        layout: {
            padding: 30
        },
        tooltips: {
            callbacks: {
                label(tooltipItem, data) {
                    var dataset = data.datasets[tooltipItem.datasetIndex];
                    return ' ' + dataset._label[tooltipItem.index] + ': ' + dataset.data[tooltipItem.index]._x + 'BV, ' + dataset.data[tooltipItem.index]._y + 'EST';
                }
            }

        }


    };

    console.log(chartValues);

    var data = {
        datasets: [{
            label: 'ALL RELEASES',
            _label: Object.keys(chartValues),
            data: Object.keys(chartValues).map(function(key) {
                return {
                    x: chartValues[key].nBV,
                    _x: chartValues[key].bv,
                    y: chartValues[key].nTaskEstimate,
                    _y: chartValues[key].taskEstimate,
                    r: 30
                };
            }),
            fill: true,
            borderColor: 'rgba(52, 101, 170, 0.5)',
            backgroundColor: '#3465AA',
            pointBorderColor: 'rgba(52, 101, 170, 0.5)',
            pointBackgroundColor: '#3465AA'
        }]
    };

    var ctx = $("#myChart");
    ctx.show();
    $("#noData").hide();

    new Chart(ctx, {
        type: 'bubble',
        data: data,
        options: options
    });
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
                    var chartValues = rally.buildBubbleChartData(stories, 'c_BizValue', 'TaskActualTotal');
                    //var chartValues = rally.buildBubbleChartData(stories, 'c_BizValue', 'TaskEstimateTotal');
                    //var chartValues = rally.buildBubbleChartData(stories, 'c_BizValue', 'PlanEstimate');
                    buildChartJS(chartValues, prj);
                });
            })
            .fail(function(err) {
                console.log(err);
            });
    });
}

$(function() {


    Chart.plugins.register({
        afterDatasetsDraw: function(chartInstance, easing) {
            // To only draw at the end of animation, check for easing === 1
            var ctx = chartInstance.chart.ctx;
            chartInstance.data.datasets.forEach(function(dataset, i) {
                var meta = chartInstance.getDatasetMeta(i);
                if (!meta.hidden) {
                    meta.data.forEach(function(element, index) {
                        // Draw the text in black, with the specified font
                        ctx.fillStyle = 'white';
                        var fontSize = 9;
                        var fontStyle = 'normal';
                        var fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
                        ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);
                        // Just naively convert to string for now
                        // <---- ADJUST TO DESIRED TEXT --->
                        var dataString = dataset._label[index].toString();
                        // Make sure alignment settings are correct
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        var padding = -5;
                        var position = element.tooltipPosition();
                        ctx.fillText(dataString, position.x, position.y - (fontSize / 2) - padding);
                    });
                }
            });
        }
    });


    Chart.plugins.register({
        beforeDraw: function(chart, easing) {
            var chartArea = chart.chartArea;
            var ctx = chart.chart.ctx;

            var fontSize = 10;
            var fontStyle = 'normal';
            var fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Replace these IDs if you have given your axes IDs in the config
            var xScale = chart.scales['x-axis-0'];
            var yScale = chart.scales['y-axis-0'];

            var midX = xScale.getPixelForValue(0.5);
            var midY = yScale.getPixelForValue(0.5);

            // Top left quadrant
            ctx.fillStyle = 'rgba(254, 254, 0, 0.1)';
            ctx.fillRect(chartArea.left, chartArea.top, midX - chartArea.left, midY - chartArea.top);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText('High Value; Low Effort', xScale.getPixelForValue(0.25), yScale.getPixelForValue(0.75));

            // Top right quadrant
            ctx.fillStyle = 'rgba(254, 0, 0, 0.1)';
            ctx.fillRect(midX, chartArea.top, chartArea.right - midX, midY - chartArea.top);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText('Low Value; High Effort', xScale.getPixelForValue(0.75), yScale.getPixelForValue(0.75));


            // Bottom right quadrant
            ctx.fillStyle = 'rgba(254, 254, 0, 0.1)';
            ctx.fillRect(midX, midY, chartArea.right - midX, chartArea.bottom - midY);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText('Low Value; Low Effort', xScale.getPixelForValue(0.75), yScale.getPixelForValue(0.25));

            // Bottom left quadrant
            ctx.fillStyle = 'rgba(0, 254, 0, 0.1)';
            ctx.fillRect(chartArea.left, midY, midX - chartArea.left, chartArea.bottom - midY);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText('High Value; Low Effort', xScale.getPixelForValue(0.25), yScale.getPixelForValue(0.25));
        }
    });

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

});

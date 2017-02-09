/*
    bv-bubble.js:  
    
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
}

function BVBubbleChart() {

    var rally = new RallyAPI();

    this.init = init;

    var hideColors = true;

    /**
     * Build the data for the bubble chart
     */
    function buildBubbleChartData(userStories) {
        var datasetHash = [];

        userStories.forEach(function(story) {
            if (story.Iteration) {
                var iterationName = story.Iteration.Name;

                if (!datasetHash[iterationName])
                    datasetHash[iterationName] = {
                        start: (story.Iteration) ? new Date(story.Iteration.StartDate) : null,
                        end: (story.Iteration) ? new Date(story.Iteration.EndDate) : null,
                        taskEstimate: 0,
                        planEstimate: 0,
                        taskActuals: 0,
                        bv: 0,
                    };
                datasetHash[iterationName].taskEstimate += story.TaskEstimateTotal;
                datasetHash[iterationName].taskActuals += story.TaskActualTotal;
                datasetHash[iterationName].planEstimate += story.PlanEstimate;
                datasetHash[iterationName].bv += story.c_BizValue;
            }
        });

        var maxBV = Object.keys(datasetHash).map(function(e) {
            return datasetHash[e].bv;
        }).max();
        var maxTaskEstimate = Object.keys(datasetHash).map(function(e) {
            return datasetHash[e].taskEstimate;
        }).max();
        var maxTaskActuals = Object.keys(datasetHash).map(function(e) {
            return datasetHash[e].taskActuals;
        }).max();
        var maxPlanEstimate = Object.keys(datasetHash).map(function(e) {
            return datasetHash[e].planEstimate;
        }).max();

        Object.keys(datasetHash).forEach(function(key) {
            if (maxBV === 0 || maxTaskEstimate === 0 || maxTaskActuals === 0 || maxPlanEstimate === 0 || datasetHash[key].bv === 0 || datasetHash[key].taskEstimate === 0 || datasetHash[key].planEstimate === 0) {
                delete datasetHash[key];
            }
            else {
                datasetHash[key].nBV = 1 - (datasetHash[key].x / maxBV);
                datasetHash[key].nTaskEstimate = (datasetHash[key].taskEstimate / maxTaskEstimate);
                datasetHash[key].nTaskActuals = (datasetHash[key].taskActuals / maxTaskActuals);
                datasetHash[key].nPlanEstimate = (datasetHash[key].planEstimate / maxPlanEstimate);
            }
        });
        return datasetHash;
    }



    /**
     * Build the actual chart from the data; uses Chart.js.
     * 
     */
    function buildChartJS(chartValues, prj) {

        var options = {
            title: {
                display: true,
                text: 'Plan vs Business Value - DUMMY DATA',
                fontSize: 16,
                padding: 30
            },
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: 'Plan Estimate (Low to High)'
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
                        labelString: 'Business Value (High to Low)'
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
                        return ' ' + dataset._label[tooltipItem.index] + ': ' + 
                                     dataset.data[tooltipItem.index]._x + ' BV, ' + 
                                     dataset.data[tooltipItem.index]._y + ' hrs effort, ' + 
                                     dataset.data[tooltipItem.index].r + ' Story Points';
                    }
                }

            }


        };

        var data = {
            datasets: [{
                label: 'ALL RELEASES',
                _label: ['Sprint 1', 'Sprint 2', 'Sprint 3'],
                data: [
                    {x: 0.5, _x: 50, y: 0.1, _y: 10, r: 60}, 
                    {x: 0.75, _x: 25, y: 0.5, _y: 50, r: 30}, 
                    {x: 0.25, _x: 75,y: 0.9,_y: 90,r: 25}, 
                    ],
                /*                      
                                Object.keys(chartValues).map(function(key) {
                                    return {
                                        x: chartValues[key].nBV,
                                        _x: chartValues[key].bv,
                                        y: chartValues[key].nTaskEstimate,
                                        _y: chartValues[key].taskEstimate,
                                        r: 30
                                    };
                                }),
                */
                fill: true,
                borderColor: '#4682b4',
                backgroundColor: '#4682b4',
                pointBorderColor: '#4682b4',
                pointBackgroundColor: '#4682b4'
            }]
        };

        if (true) { //chartValues.length > 0 ){
            var ctx = $("#myChart");
            ctx.show();
            $("#noData").hide();

            new Chart(ctx, {
                type: 'bubble',
                data: data,
                options: options
            });
        }
        else {
            $("#myChart").hide();
            $("#noData").show();
        }
    }


    /**
     * Update the chart object based on the projectId
     */
    function updateChart(projectId) {
        rally.getProject(projectId).then(function(prj) {
            rally.getStoriesForProject(prj).then(function(stories) {
                    $.when.apply(null, rally.hydrateIterations(stories)).then(function() {
                        var chartValues = buildBubbleChartData(stories, 'c_BizValue', 'TaskActualTotal');
                        //var chartValues = buildBubbleChartData(stories, 'c_BizValue', 'TaskEstimateTotal');
                        //var chartValues = buildBubbleChartData(stories, 'c_BizValue', 'PlanEstimate');
                        buildChartJS(chartValues, prj);
                    });
                })
                .fail(function(err) {
                    console.log(err);
                });
        });
    }

    function afterDatasetsDraw(chartInstance, easing) {
        // To only draw at the end of animation, check for easing === 1
        var ctx = chartInstance.chart.ctx;
        chartInstance.data.datasets.forEach(function(dataset, i) {
            var meta = chartInstance.getDatasetMeta(i);
            if (!meta.hidden) {
                meta.data.forEach(function(element, index) {
                    // Draw the text in black, with the specified font
                    ctx.fillStyle = 'white';
                    var fontSize = 10;
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

    function beforeDraw(chart, easing) {
        var chartArea = chart.chartArea;
        var ctx = chart.chart.ctx;

        var fontSize = 18;
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
        if (!hideColors) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // yellow
            ctx.fillRect(chartArea.left, chartArea.top, midX - chartArea.left, midY - chartArea.top);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillText('High Value; High Effort', xScale.getPixelForValue(0.25), yScale.getPixelForValue(0.75));

        // Top right quadrant
        if (!hideColors) {
            ctx.fillStyle = 'rgba(153, 0, 0, 0.4)'; // red
            ctx.fillRect(midX, chartArea.top, chartArea.right - midX, midY - chartArea.top);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillText('Low Value; High Effort', xScale.getPixelForValue(0.75), yScale.getPixelForValue(0.75));


        // Bottom right quadrant
        if (!hideColors) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // yellow
            ctx.fillRect(midX, midY, chartArea.right - midX, chartArea.bottom - midY);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillText('Low Value; Low Effort', xScale.getPixelForValue(0.75), yScale.getPixelForValue(0.25));

        // Bottom left quadrant
        if (!hideColors) {

            ctx.fillStyle = 'rgba(0, 102, 0, 0.4)'; // green
            ctx.fillRect(chartArea.left, midY, midX - chartArea.left, chartArea.bottom - midY);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillText('High Value; Low Effort', xScale.getPixelForValue(0.25), yScale.getPixelForValue(0.25));
    }


    /**
     * Update the select list of projects
     */
    function updateProjects() {
        rally.getProjects().then(function(projectSummaries) {
            $.when.apply(null, rally.hydrateProjects(projectSummaries)).then(function() {
                var projSelect = $('#selectProject');
                projSelect.change(function() {
                    updateChart($('#selectProject option:selected').val());
                });
                projectSummaries.forEach(function(project, i) {
                    if (i === 0) updateChart(project.ObjectID.toString());
                    projSelect.append($('<option></option>').val(project.ObjectID.toString()).html(project._refObjectName + ' - ' + project.Description));
                });

            });
        });
    }


    /**
     * Initialize the chart and data
     */
    function init() {

        Chart.plugins.register({
            afterDatasetsDraw: afterDatasetsDraw,
            beforeDraw: beforeDraw
        });

        updateProjects();
    }

    return this;

}

if (typeof module !== 'undefined')
    module.exports = BVBubbleChart;

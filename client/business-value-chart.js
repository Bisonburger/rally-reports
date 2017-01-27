/* global $ Highcharts RallyAPI */
$(function() {

    var rally = new RallyAPI('53678');
    rally.query()
        .then(function(res) {
            rally.stories = res.QueryResult.Results;
            rally.processIterations();
            $.when.apply(null, rally.iterations)
                .then(function() {
                    rally.buildChartData('TaskEstimateTotal');
                })
                .then(function() {
                    Object.keys(rally.iterHash).forEach(function(key) {
                        Highcharts.chart('container', {
                            title: {
                                text: 'Business Value Burn Up\nfor Local Project',
                                x: -20 //center
                            },
                            subtitle: {
                                text: 'Planned vs Actuals',
                                x: -20
                            },
                            animation: {
                                startup: true
                            },
                            focusTarget: 'datum',
                            xAxis: {
                                categories: Object.keys(rally.iterHash),
                                title: 'Iterations'
                            },
                            yAxis: {
                                title: {
                                    text: 'Business Value\n% Complete'
                                },
                                plotLines: [{
                                    value: 0,
                                    width: 1,
                                    color: '#808080'
                                }],
                                max: 100,
                                min: 0,
                                tickAmount: 6
                            },
                            tooltip: {
                                valueSuffix: '%'
                            },
                            legend: {
                                layout: 'vertical',
                                align: 'right',
                                verticalAlign: 'middle',
                                borderWidth: 0,
                                position: 'top',
                                textStyle: {
                                    fontSize: 12
                                }

                            },
                            series: [{
                                name: 'Planned',
                                data: Object.keys(rally.iterHash).map(function(e) {
                                    return rally.iterHash[e].planned;
                                }),
                                color: '#E8D7AB',
                                lineWidth: 2
                            }, {
                                name: 'Actual',
                                data: Object.keys(rally.iterHash).map(function(e) {
                                    return rally.iterHash[e].actual;
                                }),
                                color: '#3465AA',
                                lineWidth: 3
                            }]
                        });
                    });

                });
        });

});

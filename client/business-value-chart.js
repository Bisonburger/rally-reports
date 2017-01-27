/* global $ Highcharts RallyAPI */
$(function() {
    var rally = new RallyAPI();
    var column = 'BusinessValue';

    var projOptions = {
        val1: 'PCD - Product Comparison Database',
        val2: 'SSV - Subtier Supplier View'
    };
    var projSelect = $('#selectProject');
    $.each(projOptions, function(val, text) {
        projSelect.append($('<option></option>').val(val).html(text));
    });

    var relOptions = {
        val1: 'Release 1 Farnborough',
        val2: 'Release 2 Production'
    };
    var relSelect = $('#selectRelease');
    $.each(relOptions, function(val, text) {
        relSelect.append($('<option></option>').val(val).html(text));
    });


    rally.getProject('34279769').then(function(prj) {
        rally.getStoriesForProject(prj).then(function(stories) {
            $.when.apply(null, rally.hydrateIterations(stories)).then(function() {
                var chartValues = rally.buildChartData(stories, column);

                Highcharts.chart('container', {
                    title: {
                        text: column + ' Burn Up\nfor Project Comparison Database',
                        x: -20 //center
                    },
                    subtitle: {
                        text: 'Planned vs Actuals: Release 1 Farnborough',
                        x: -20
                    },
                    animation: {
                        startup: true
                    },
                    focusTarget: 'datum',
                    xAxis: {
                        categories: Object.keys(chartValues),
                        title: 'Iterations'
                    },
                    yAxis: {
                        title: {
                            text: column + '\n% Complete'
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
                        position: 'left',
                        textStyle: {
                            fontSize: 16
                        }
                    },
                    series: [{
                        name: 'Planned',
                        data: Object.keys(chartValues).map(function(e) {
                            return chartValues[e].p_planned;
                        }),
                        color: '#E8D7AB',
                        lineWidth: 1
                    }, {
                        name: 'Actual',
                        data: Object.keys(chartValues).map(function(e) {
                            return chartValues[e].p_actual;
                        }),
                        color: '#3465AA',
                        lineWidth: 3
                    }]
                });
            });
        });
    });
});

/* global $ Highcharts RallyAPI */

    var column = 'BusinessValue';
    var rally = new RallyAPI();
    var selectedProject = null;
    var selectedRelease = null;
    var type = 'ALL';


function updateReleases( projectId ){
    rally.getProject(projectId).then(function(prj){ 
        rally.getReleasesForProject(prj).then( function(releases){ 
            prj.Releases = releases;
            $.when.apply(null, rally.hydrateReleases(prj.Releases)).then( function(){ 
                var relSelect = $('#selectRelease');
                relSelect.change( function(){
                    var sr = $('#selectRelease option:selected');
                    if( sr.val() === 'ALL' || sr.val() === 'NONE' ){
                        selectedRelease = null;
                        type = sr.val();
                    }
                    else 
                        rally.getRelease( sr.val() ).then( function(r){ selectedRelease = r; } );
                    updateChart( selectedProject );
                });
                relSelect.empty();
                selectedRelease = null;
                if( prj.Releases.length > 1 )
                    relSelect.append($('<option></option>').val('ALL').html('ALL RELEASES') ).prop('selected',true);
                prj.Releases.forEach( function(release,i){
                    relSelect.append($('<option></option>').val(release.ObjectID).html(release.Name) );
                });   
                relSelect.append($('<option></option>').val('NONE').html('NO RELEASE ASSIGNED') );
            });  
        });
    });    
}


function updateChart( projectId ){
    rally.getProject(projectId).then(function(prj) {
        rally.getStoriesForProject(prj).then(function(stories) {
            //TODO: filter stories by release
            if( selectedRelease ) 
                stories = stories.filter( function(story){ return( story.Release && story.Release._ref ===selectedRelease._ref); } );
            else{
                if( type === 'NONE' )
                    stories = stories.filter( function(story){ return( !story.Release ); } );
            }
            $.when.apply(null, rally.hydrateIterations(stories)).then(function() {
                var chartValues = rally.buildChartData(stories, column);
                
                

                Highcharts.chart('container', {
                    title: {
                        text: column.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1") + ' Burn Up\nfor ' + prj.Description + ' (' + prj._refObjectName + ')',
                        x: -20 //center
                    },
                    subtitle: {
                        text: 'Planned vs Actuals: ' + $('#selectRelease option:selected').text(),
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
                            text: column.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1") + '\n% Complete'
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
        })
        .fail( function(err){ console.log(err);} );
    });
}

$(function() {

    rally.getProjects().then( function( projectSummaries ){
        $.when.apply( null,rally.hydrateProjects(projectSummaries)).then(function(){
            var projSelect = $('#selectProject');
            projSelect.change( function(){
                var sp = $('#selectProject option:selected');
                selectedProject = sp.val();    
                updateChart(selectedProject);
                updateReleases(selectedProject);
            });

            projectSummaries.forEach( function(project,i){
                if( i === 0 ){
                    selectedProject = project.ObjectID.toString();
                    updateChart(project.ObjectID.toString());
                    updateReleases(project.ObjectID.toString());
                }
                projSelect.append($('<option></option>').val(project.ObjectID.toString()).html(project._refObjectName + ' - ' + project.Description) );
            });
            
        });
    });

});

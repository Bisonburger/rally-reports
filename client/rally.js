/* global $ */

function RallyAPI() {
    this.basePath = '/slm/webservice/v2.0';
    $.ajaxSetup({
        contentType: 'application/json',
        dataType: 'text',
        xhrFields: {
            withCredentials: true
        }
    });
}

RallyAPI.prototype.hydrateIterations = function(userStories) {
    var me = this;
    
    var iterations = [];
    
    userStories.forEach( function(story){
        if( story.Iteration )
            iterations.push( me.getIterationForStory(story).then( function(iteration){ story.Iteration = iteration;}) );
    });
    return iterations;
};

RallyAPI.prototype.fetch = function( url, config ){
    return $.get(url, config).then( function(res){ return JSON.parse(res); } );
};


RallyAPI.prototype.buildChartData = function(userStories, fieldName){
    var me = this;
    var iterHash = {};
    
    if( !fieldName ) fieldName = me.summaryCol;
    
    // build actuals/planned
    userStories.forEach( function(story){
        if( story.Iteration ){
            if( !iterHash[story.Iteration.Name] )
                iterHash[story.Iteration.Name] = { 
                    start: new Date(story.Iteration.StartDate), 
                    end: new Date(story.Iteration.EndDate), 
                    actual: 0, 
                    planned: 0,
                    c_actual: 0,
                    c_planned: 0,
                    p_actual: 0,
                    p_planned: 0
                };
            var storyCompleted = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed') ? 1 : 0;
            iterHash[story.Iteration.Name].actual += storyCompleted * story.Iteration[fieldName];
            iterHash[story.Iteration.Name].planned += story.Iteration[fieldName];
        }
    });

        
    // build cumulatives
    var lastKey = undefined;
    Object.keys( iterHash ).forEach( function(iteration){
        var lastValue = ( lastKey )? iterHash[ lastKey ] : { actual: 0, planned: 0, c_actual: 0, c_planned: 0, p_actual: 0, p_planned: 0 };
        iterHash[iteration].c_actual += lastValue.c_actual + iterHash[iteration].actual;
        iterHash[iteration].c_planned += lastValue.c_planned + iterHash[iteration].planned;
        lastKey = iteration;
    });

    var maxPlanned = Object.keys(iterHash).map(function(e) {return iterHash[e].c_planned;}).max();
    
    // build %
    var showActuals = true;
    Object.keys( iterHash ).forEach( function(iteration) { 
        iterHash[iteration].p_actual = iterHash[iteration].c_actual / maxPlanned * 100;
        if( iteration === 'Sprint 09' ) showActuals = false;
        if( !showActuals ) iterHash[iteration].p_actual = undefined;
        iterHash[iteration].p_planned = iterHash[iteration].c_planned / maxPlanned * 100;
    });    
    return iterHash;
};

RallyAPI.prototype.getProject = function(projectId){
    return this.fetch( this.basePath + '/project/' + projectId ).then( function(res){ return res.Project; });
};

RallyAPI.prototype.getIterationsForProject = function( proj ){
    return this.fetch( proj.Iterations._ref )
        .then( function(res){ return res.QueryResult.Results;});
};

RallyAPI.prototype.getIteration = function( iterationId ){
    return this.fetch( this.basePath + '/iteration/' + iterationId ).then( function(res){ return res.Iteration; } );
};

RallyAPI.prototype.getIterationForStory = function( story ){
    return this.fetch( story.Iteration._ref ).then( function(res){ return res.Iteration; } );    
};

RallyAPI.prototype.getStoriesForProject = function( proj ){
    
    var querystring = $.param({
        order: 'Iteration.StartDate',
        fetch: true,
        pagesize: 200,
        start: 1,
        project: proj._ref
    });

    return this.fetch(this.basePath + '/hierarchicalrequirement?' + querystring).then( function(res){ return res.QueryResult.Results; });    
};

RallyAPI.prototype.getProjects = function(){
    return this.fetch( this.basePath + '/project' ).then( function(res){ return res.QueryResult.Results} );    
};

RallyAPI.prototype.hydrateProjects = function(projects) {
    var me = this;
    var proj = [];
    projects.forEach( function(project,i,a){ 
        proj.push( me.fetch(project._ref).then( function(pro){ a[i]=pro.Project; } ) );
    });
    return proj;
};

RallyAPI.prototype.getReleasesForProject = function( project ){
    return this.fetch( project.Releases._ref ).then( function(res){ return res.QueryResult.Results; } );    
};

RallyAPI.prototype.hydrateReleases = function( rels ){
    var me = this;
    var releases = [];
    rels.forEach( function(rel,i,a){releases.push( me.fetch(rel._ref).then( function(r){ a[i] = r.Release;}) );});
    return releases;
};

RallyAPI.prototype.getRelease = function( relId ){
    return this.fetch( this.basePath + '/release/' + relId ).then( function(res){ return res.Release; });    
};
    

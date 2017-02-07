/*
    rally.js:  utility methods to access the RALLY REST API
    
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
 
 /* global $ */

/**
 * RallyAPI
 */
function RallyAPI() {
    this.basePath = '/slm/webservice/v2.0';
    this.summaryCol = 'c_BizValue';
    $.ajaxSetup({
        contentType: 'application/json',
        dataType: 'text',
        xhrFields: {
            withCredentials: true
        }
    });
}

/**
 * Hydrate the iterations section of a set of user stories by iterating through the stories and fetching
 * the detailed iteration record for each iteration summary mentioned in the story
 *
 * @param {UserStory[]} userStories
 * @return {Promise[] -> Iteration[]}
 */
RallyAPI.prototype.hydrateIterations = function(userStories) {
    var me = this;
    var iterations = [];
    userStories.forEach( function(story){
        if( story.Iteration )
            iterations.push( me.getIterationForStory(story).then( function(iteration){ story.Iteration = iteration;}) );
    });
    return iterations;
};

/**
 * Fetch data from a URL with a given config and convert the results to JSON
 * 
 * @param {String} url
 * @param {Object} config
 * @return {Object}
 */
RallyAPI.prototype.fetch = function( url, config ){
    return $.get(url, config).then( function(res){ return JSON.parse(res); } );
};

RallyAPI.prototype.buildBubbleChartData = function( userStories ){
    var datasetHash = [];
    
    userStories.forEach( function(story){
        if(story.Iteration){
        var iterationName = story.Iteration.Name;

        if( !datasetHash[iterationName] )
            datasetHash[iterationName] = { 
                start: (story.Iteration)? new Date(story.Iteration.StartDate) : null, 
                end: (story.Iteration)? new Date(story.Iteration.EndDate) : null,
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

    var maxBV = Object.keys(datasetHash).map(function(e) {return datasetHash[e].bv;}).max();
    var maxTaskEstimate = Object.keys(datasetHash).map(function(e) {return datasetHash[e].taskEstimate;}).max();
    var maxTaskActuals = Object.keys(datasetHash).map(function(e) {return datasetHash[e].taskActuals;}).max();
    var maxPlanEstimate = Object.keys(datasetHash).map(function(e) {return datasetHash[e].planEstimate;}).max();

    Object.keys(datasetHash).forEach( function(key){ 
        if( maxBV === 0 || maxTaskEstimate === 0 || maxTaskActuals === 0 || maxPlanEstimate === 0 || datasetHash[key].bv === 0  || datasetHash[key].taskEstimate === 0 || datasetHash[key].planEstimate === 0){
            delete datasetHash[key]; 
        }
        else{
            datasetHash[key].nBV = 1-(datasetHash[key].x / maxBV);
            datasetHash[key].nTaskEstimate = (datasetHash[key].taskEstimate / maxTaskEstimate);
            datasetHash[key].nTaskActuals = (datasetHash[key].taskActuals / maxTaskActuals);
            datasetHash[key].nPlanEstimate = (datasetHash[key].planEstimate / maxPlanEstimate);
        }
    } );
    return datasetHash;
};

/**
 * Build the chart data for a set of user stories for a given field name
 */
RallyAPI.prototype.buildChartData = function(userStories, fieldName){
    var iterHash = {};
    
    if( !fieldName ) fieldName = this.summaryCol;
    
    // build actuals/planned
    userStories.forEach( function(story){
        var iterationName = (story.Iteration)? story.Iteration.Name : 'UNASSIGNED';
        if( !iterHash[iterationName] )
            iterHash[iterationName] = { 
                start: (story.Iteration)? new Date(story.Iteration.StartDate) : null, 
                end: (story.Iteration)? new Date(story.Iteration.EndDate) : null,
                hasActuals: (story.Iteration && new Date(story.Iteration.EndDate) <= new Date() ),
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
    Object.keys( iterHash ).forEach( function(iteration){
        var lastValue = ( lastKey )? iterHash[ lastKey ] : { actual: 0, planned: 0, c_actual: 0, c_planned: 0, p_actual: 0, p_planned: 0 };
        iterHash[iteration].c_actual += lastValue.c_actual + iterHash[iteration].actual;
        iterHash[iteration].c_planned += lastValue.c_planned + iterHash[iteration].planned;
        lastKey = iteration;
    });

    var maxPlanned = Object.keys(iterHash).map(function(e) {return iterHash[e].c_planned;}).max();
    
    // build %
    Object.keys( iterHash ).forEach( function(iteration) { 
        iterHash[iteration].p_actual = (iterHash[iteration].hasActuals)? iterHash[iteration].c_actual / maxPlanned * 100 : undefined;
        iterHash[iteration].p_planned = iterHash[iteration].c_planned / maxPlanned * 100;
    });    
    
    console.log( iterHash );
    return iterHash;
};

/**
 * Get a project record by ID
 * 
 * @param {string} projectId 
 * @return {Promise->Project}
 */
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

RallyAPI.prototype.hydrateIterationsForProject = function( iterations ){

    var me = this;
    var _iterations = [];
    iterations.forEach( function(iter,i,a){_iterations.push( me.fetch(iter._ref).then( function(it){ a[i] = it.Iteration;}) );});
    return _iterations;
};


RallyAPI.prototype.getRelease = function( relId ){
    return this.fetch( this.basePath + '/release/' + relId ).then( function(res){ return res.Release; });    
};
    

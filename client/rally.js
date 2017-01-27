/* global $ */

function RallyAPI(projectId, host) {
    this.projectId = projectId;
    this.url = (host ? host : '') + '/slm/webservice/v2.0/hierarchicalrequirement?' +
        'order=Iteration.StartDate&fetch=true&pagesize=200&start=1&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/' + this.projectId;
    this.iterations = [];
    this.iterHash = {};
    this.stories = [];
    this.summaryCol = 'BusinessValue';
}

RallyAPI.prototype.processIterations = function() {
    var me = this;
    
    me.stories.map( function(story){
        if( story.Iteration )
            me.iterations.push( $.ajax( {url: story.Iteration._ref, contentType: 'application/json' } ).then( function(res){ story.Iteration = res.Iteration;}) );
    });
};

RallyAPI.prototype.query = function(config) {
    if( !config ) config = {};
    var conf = {
        url: this.url,
        contentType: 'application/json',
        xhrFields: {
            withCredentials: true
        }
    };

    return $.ajax( Object.assign( conf, config ) );
};

RallyAPI.prototype.buildChartData = function(fieldName){
    var me = this;
    
    if( !fieldName ) fieldName = me.summaryCol;
    
    // build actuals/planned
    me.stories.forEach( function(story){
        if( story.Iteration ){
            if( !me.iterHash[story.Iteration.Name] )
                me.iterHash[story.Iteration.Name] = { start: new Date(story.Iteration.StartDate), end: new Date(story.Iteration.EndDate), actual: 0, planned: 0 };
            var storyCompleted = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed') ? 1 : 0;
            me.iterHash[story.Iteration.Name].actual += storyCompleted * story.Iteration[fieldName];
            me.iterHash[story.Iteration.Name].planned += story.Iteration[fieldName] + Math.floor(Math.random() * (3 - (-3) + 1)) + (-3);
        }
    });
    
    // build cumulatives
    var lastKey = undefined;
    Object.keys( me.iterHash ).forEach( function(iteration){
        var lastValue = ( lastKey )? me.iterHash[ lastKey ] : { actual: 0, planned: 0 };
        me.iterHash[iteration].actual += lastValue.actual;
        me.iterHash[iteration].planned += lastValue.planned;
        lastKey = iteration;
    });
    

    var maxPlanned = Object.keys(me.iterHash).map(function(e) {return me.iterHash[e].planned;}).max();

    // build %
    Object.keys( me.iterHash ).forEach( function(iteration) { 
        me.iterHash[iteration].actual = Math.roundx( me.iterHash[iteration].actual / maxPlanned * 100 );    
        if( iteration === 'Sprint 11' || iteration === 'Sprint 12' || iteration === 'Sprint 13' || iteration === 'Sprint 14' )
            me.iterHash[iteration].actual = undefined;
        me.iterHash[iteration].planned = Math.roundx( me.iterHash[iteration].planned / maxPlanned * 100 );
    });    
    
};



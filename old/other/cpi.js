var rally = require("rally"),
    restApi = rally({ 
        server: 'http://147.24.140.63', //server: 'https://agile.rms.ray.com',
        requestOptions: {
            headers: {
                'Host': '147.24.140.63',
                'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS, DELETE',
				'Access-Control-Max-Age': '3600',
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Headers': '*'
            },
            timeout: 10000,
            followAllRedirects: true
        }
    }),
    queryUtils = rally.util.query;

//matthew.r.young-nr@raytheon.com Charlie7!@
console.log( 'query' );

restApi.query({
    type: 'hierarchicalrequirement', //the type to query
    start: 1, //the 1-based start index, defaults to 1
    pageSize: 2, //the page size (1-200, defaults to 200)
    limit: 10, //the maximum number of results to return- enables auto paging
    order: 'Rank', //how to sort the results
    fetch: ['FormattedID', 'Name', 'ScheduleState', 'Children'], //the fields to retrieve
    query: queryUtils.where('DirectChildrenCount', '>', 0), //optional filter
    requestOptions: {} //optional additional options to pass through to request
}, function(error, result) {
    if(error) {
        console.log(error);
    } else {
        console.log(result.Results);
    }
});

console.log('done');
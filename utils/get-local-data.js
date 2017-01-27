
var https = require('https');
var fs = require('fs');
var Q = require( 'q' );
var url = require( 'url' );


var buffer = [];


function getDataFromURL( inUrl ){
    
    var parsedURL = url.parse(inUrl);
 
    var _defer = Q.defer();
    
    https.get( {
            host: parsedURL.host,
            rejectUnauthorized: false,
            auth: `${process.env.RALLY_USERNAME}:${process.env.RALLY_PASSWORD}`,
            path: parsedURL.path
            }, (realRes) => {
                buffer = [];
                realRes.on('data', (d) =>  buffer.push( d ) );
                realRes.on( 'end', () => _defer.resolve( buffer.join('') ) );
            } );
    return _defer.promise;
}

var projectId = '34279769';

getDataFromURL( `https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?order=Iteration.StartDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}` )
    .then( (data) => { 
        fs.writeFileSync("./data/userstories.json", data.replace( /https:\/\/agile.rms.ray.com/g, '') ); 
        var stories = JSON.parse( data );
        stories.QueryResult.Results.forEach( (story) => {
            getDataFromURL( story.Iteration._ref ).then( (iterationData) => {
                var iter = JSON.parse(iterationData);
                iter.Iteration.BusinessValue = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
                iterationData = JSON.stringify(iter);
                fs.writeFileSync(`./data/iteration/${iter.Iteration.ObjectID}.json`, iterationData.replace( /https:\/\/agile.rms.ray.com/g, '') );
                getDataFromURL( iter.Iteration.UserIterationCapacities._ref ).then( (uicData) => { 
                    var uic = JSON.parse(uicData);
                    fs.writeFileSync(`./data/iteration/${iter.Iteration.ObjectID}-uic.json`, uicData.replace( /https:\/\/agile.rms.ray.com/g, '') );
                    uic.QueryResult.Results.forEach( (uicObj) => { 
                        getDataFromURL( uicObj._ref ).then( (uicObjData) => {
                            var uo = JSON.parse(uicObjData);
                            fs.writeFileSync(`./data/uic/${uo.UserIterationCapacity.ObjectID}.json`, uicObjData.replace( /https:\/\/agile.rms.ray.com/g, '') );
                        } );
                    } );
                });
            });
        });
    });
    
getDataFromURL( `https://agile.rms.ray.com/slm/webservice/v2.0/releases?order=ReleaseDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}` )
    .then( ( data ) => {
        fs.writeFileSync('./data/releases.json', data.replace( /https:\/\/agile.rms.ray.com/g, '') );       
    });




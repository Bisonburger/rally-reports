var https = require('https');
var fs = require('fs');
var Q = require('q');
var url = require('url');



function getDataFromURL(inUrl) {

    var buffer;
    var parsedURL = url.parse(inUrl);
    var _defer = Q.defer();

    https.get({
        host: parsedURL.host,
        rejectUnauthorized: false,
        auth: `${process.env.RALLY_USERNAME}:${process.env.RALLY_PASSWORD}`,
        path: parsedURL.path
    }, (realRes) => {
        buffer = [];
        realRes.on('data', (d) => buffer.push(d));
        realRes.on('end', () => _defer.resolve(buffer.join('')));
    });
    return _defer.promise;
}


function getProjectData(projectId) {
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawProj) => {
            console.log(`writing ./data/project/${projectId}.json`);
            fs.writeFileSync(`./data/project/${projectId}.json`, rawProj.replace(/https:\/\/agile.rms.ray.com/g, ''));
            getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}/iterations`)
                .then((rawIterationList) => {
                    console.log(`writing ./data/iterations-${projectId}.json`);
                    fs.writeFileSync(`./data/iterations-${projectId}.json`, rawIterationList.replace(/https:\/\/agile.rms.ray.com/g, ''));
                    var iterationList = JSON.parse(rawIterationList).QueryResult.Results;
                    iterationList.forEach(function(iteration) {
                        getDataFromURL(iteration._ref).then(function(rawIter) {
                            console.log(`writing ./data/iteration/${iteration.ObjectID}.json`);
                            var iter = JSON.parse( rawIter.replace(/https:\/\/agile.rms.ray.com/g, '') );
                            iter.Iteration.BusinessValue = Math.floor(Math.random() * 4);
                            fs.writeFileSync(`./data/iteration/${iteration.ObjectID}.json`, JSON.stringify(iter) );
                        });
                    });
                });
        });
}


function getStories(projectId) {
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?order=Iteration.StartDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawStoriesList) => {
            console.log(`writing ./data/stories-${projectId}.json`);
            fs.writeFileSync(`./data/stories-${projectId}.json`, rawStoriesList.replace(/https:\/\/agile.rms.ray.com/g, ''));
        });
}

function getReleases(projectId) {
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/releases?order=ReleaseDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawReleaseList) => {
            console.log(`writing ./data/releases-${projectId}.json`);
            fs.writeFileSync(`./data/releases-${projectId}.json`, rawReleaseList.replace(/https:\/\/agile.rms.ray.com/g, ''));
            var releaseList = JSON.parse(rawReleaseList).QueryResult.Results;
            releaseList.forEach(function(release) {
                console.log('release: ' + release.ObjectID);
                getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/release/${release.ObjectID}`).then((rawRelease) => {
                    fs.writeFileSync(`./data/release/${release.ObjectID}.json`, rawRelease.replace(/https:\/\/agile.rms.ray.com/g, ''));
                });
            });
        });
}


['35308565', '34279769'].forEach( (projectId) => {
    getProjectData(projectId);
    getStories(projectId);
    getReleases(projectId);
});

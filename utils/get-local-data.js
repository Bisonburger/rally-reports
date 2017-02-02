/*
    get-local-data.js:  utility methods to retrieve remote data and make it local
    
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
var https = require('https');
var fs = require('fs');
var Q = require('q');
var url = require('url');


/**
 * Retrieve data (in message body) from the given URL
 * 
 * @param {String} inUrl
 * @return {Promise -> String}
 */
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


/**
 * Retrieve project data and project iterations based on the given project ID.  This method first fetches the
 * project record then proceeds to hydrate the record by fetching and replacing the summary Iteration info contained in
 * the initial project record with the full iteration record.
 * 
 * @param {String} projectId
 * @return {Promise -> Project}
 */
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

/**
 * Retrive the User stories for the given project ID.
 * 
 * @param {String} projectId
 * @return {Promise -> UserStory[]}
 */
function getStories(projectId) {
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?order=Iteration.StartDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawStoriesList) => {
            console.log(`writing ./data/stories-${projectId}.json`);
            fs.writeFileSync(`./data/stories-${projectId}.json`, rawStoriesList.replace(/https:\/\/agile.rms.ray.com/g, ''));
            var stories = JSON.parse( rawStoriesList).QueryResult.Results;
            var storyMap = stories.map( (story) => `${story.FormattedID},${story.ObjectID},\"${story.Name}\",${story.TaskStatus},${(story.c_BizValue)?story.c_BizValue:0},${(story.Iteration)?story.Iteration._refObjectName:'null'}`);
            fs.writeFileSync(`./data/stories-${projectId}.csv`,storyMap.join('\n'));
        });
}

/**
 * Retrieve the full release objects for the given project ID.
 * 
 * @param {String} projectId
 * @return {Promise -> Release[]}
 */
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


/**
 * Main
 * 
 * 35271257 - AVO / AMS Enhancements
 * 34279769 - PCD / Product Comparison Database
 * 35308565 - SSV / Subtier Supplier Viewer
 */
 
['35308565', '34279769', '35271257'].forEach( (projectId) => {
    getProjectData(projectId);
    getStories(projectId);
    getReleases(projectId);
});

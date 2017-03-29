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
var gulp = require('gulp'),
    https = require('https'),
    fs = require('fs'),
    Q = require('q'),
    url = require('url'),
    sleep = require('system-sleep');


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
    if( !fs.existsSync('./data/project') ) fs.mkdirSync('./data/project' );
    if( !fs.existsSync('./data/iteration') ) fs.mkdirSync('./data/iteration' );
    if( !fs.existsSync('./data/uic') ) fs.mkdirSync('./data/uic' );
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}?pretty=true`)
        .then((rawProj) => {
            fs.writeFileSync(`./data/project/${projectId}.json`, rawProj.replace(/https:\/\/agile.rms.ray.com/g, ''));
            getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}/iterations?pretty=true`)
                .then((rawIterationList) => {
                    fs.writeFileSync(`./data/project/iterations-${projectId}.json`, rawIterationList.replace(/https:\/\/agile.rms.ray.com/g, ''));
                    var iterationList = JSON.parse(rawIterationList).QueryResult.Results;
                    iterationList.forEach(function(iteration) {
                        getDataFromURL(`${iteration._ref}?pretty=true`).then(function(rawIter) {
                            var rI = JSON.parse( rawIter );
                            var iter = JSON.parse( rawIter.replace(/https:\/\/agile.rms.ray.com/g, '') );
                            fs.writeFileSync(`./data/iteration/${iteration.ObjectID}.json`, JSON.stringify(iter) );
                            getDataFromURL( `${rI.Iteration.UserIterationCapacities._ref}?pretty=true` ).then( function (rawUICList){ 
                                fs.writeFileSync(`./data/iteration/uic-${iteration.ObjectID}.json`,rawUICList.replace(/https:\/\/agile.rms.ray.com/g, ''));
                                var UICList = JSON.parse( rawUICList ).QueryResult.Results;
                                UICList.forEach( function(uic){ 
                                    getDataFromURL( `${uic._ref}?pretty=true` ).then( function(rawUIC){ 
                                        fs.writeFileSync(`./data/uic/${uic.ObjectID}.json`,rawUIC.replace(/https:\/\/agile.rms.ray.com/g, ''));
                                    });    
                                });
                            });
                        });
                    });
                });
        });
}

function processChildren( childrenRef, story ){
    if( !fs.existsSync('./data/userstory') ) fs.mkdirSync('./data/userstory' );
    getDataFromURL( `${childrenRef}?pretty=true` ).then( function(rawChildrenList){ 
    fs.writeFileSync(`./data/userstory/children-${story.ObjectID}.json`,rawChildrenList.replace(/https:\/\/agile.rms.ray.com/g, ''));
    var childrenList = JSON.parse( rawChildrenList ).QueryResult.Results;
    childrenList.forEach( function(child){ 
        getDataFromURL( `${child._ref}?pretty=true` ).then( function(rawChild){ 
            if( child.Children && child.Children._ref ) processChildren( child.Children._ref, child );
            fs.writeFileSync(`./data/userstory/${child.ObjectID}.json`,rawChild.replace(/https:\/\/agile.rms.ray.com/g, ''));
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
    if( !fs.existsSync('./data/project') ) fs.mkdirSync('./data/project' );
    if( !fs.existsSync('./data/userstory') ) fs.mkdirSync('./data/userstory' );
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?pretty=true&order=Iteration.StartDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawStoriesList) => {
            fs.writeFileSync(`./data/project/stories-${projectId}.json`, rawStoriesList.replace(/https:\/\/agile.rms.ray.com/g, ''));
            var stories = JSON.parse( rawStoriesList ).QueryResult.Results;
            var storyMap = stories.map( (story) => `${story.FormattedID},${story.ObjectID},\"${story.Name}\",${story.TaskStatus},${(story.c_BizValue)?story.c_BizValue:0},${(story.Iteration)?story.Iteration._refObjectName:'null'}`);
            fs.writeFileSync(`./data/project/stories-${projectId}.csv`,storyMap.join('\n'));
            stories.forEach( function(story){ 
                getDataFromURL( `${story._ref}?pretty=true` ).then( function(rawStory){
                    fs.writeFileSync(`./data/userstory/${story.ObjectID}.json`,rawStory.replace(/https:\/\/agile.rms.ray.com/g, ''));
                });     
                processChildren( story.Children._ref, story );
            });
        });
}

/**
 * Retrieve the full release objects for the given project ID.
 * 
 * @param {String} projectId
 * @return {Promise -> Release[]}
 */
function getReleases(projectId) {
    if( !fs.existsSync('./data/project') ) fs.mkdirSync('./data/project' );
    if( !fs.existsSync('./data/release') ) fs.mkdirSync('./data/release' );
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/releases?pretty=true&order=ReleaseDate&fetch=true&pagesize=200&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/${projectId}`)
        .then((rawReleaseList) => {
            fs.writeFileSync(`./data/project/releases-${projectId}.json`, rawReleaseList.replace(/https:\/\/agile.rms.ray.com/g, ''));
            var releaseList = JSON.parse(rawReleaseList).QueryResult.Results;
            releaseList.forEach(function(release) {
                getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/release/${release.ObjectID}?pretty=true`).then((rawRelease) => {
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
 * 35308565 - SSV / Subtier Supplier View
 * 35743125 - CFM Data * Reporting
 * 35615624 - PO Reporting
 * 35723837 - PRS (PPM 287099)
 * 35734993 - PRS Data & Reporting
 * 35734880 - PRS Java
 * 
 */
 // '35271257','34279769','35308565','35743125', '35615624', '35723837', '35734993', '35734880' 
function generateDataTask(){
    ['35734993', '35734880'].forEach( (projectId) =>{
        console.log( `Building data for ${projectId}`);
        getProjectData(projectId);
        sleep(5000);
        getStories(projectId);
        sleep(5000);
        getReleases(projectId);
        sleep(5000);
    });
}


gulp.task( 'generate-data', function(){
    getDataFromURL(`https://agile.rms.ray.com/slm/webservice/v2.0/project?pretty=true`).then( function(rawProjectList){
        fs.writeFileSync(`./data/projects.json`, rawProjectList.replace(/https:\/\/agile.rms.ray.com/g, ''));
    });   
    generateDataTask();
});

module.exports = generateDataTask;
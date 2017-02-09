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

if( typeof require === 'function' ){
    var $ = require( 'jquery' ); 
}

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

    this.hydrateIterations = hydrateIterations;
    this.fetch = fetch;
    this.getProject = getProject;
    this.getIterationsForProject = getIterationsForProject;
    this.getIteration = getIteration;
    this.getIterationForStory = getIterationForStory;
    this.getStoriesForProject = getStoriesForProject;
    this.getProjects = getProjects;
    this.hydrateProjects = hydrateProjects;
    this.getReleasesForProject = getReleasesForProject;
    this.hydrateReleases = hydrateReleases;
    this.hydrateIterationsForProject = hydrateIterationsForProject;
    this.getRelease = getRelease;

    /**
     * Hydrate the iterations section of a set of user stories by iterating through the stories and fetching
     * the detailed iteration record for each iteration summary mentioned in the story
     *
     * @param {UserStory[]} userStories
     * @return {Promise[] -> Iteration[]}
     */
    function hydrateIterations(userStories) {
        
        var iterations = [];
        userStories.forEach(function(story) {
            if (story.Iteration)
                iterations.push(getIterationForStory(story).then(function(iteration) {
                    story.Iteration = iteration;
                }));
        });
        return iterations;
    }

    /**
     * Fetch data from a URL with a given config and convert the results to JSON
     * 
     * @param {String} url
     * @param {Object} config
     * @return {Object}
     */
    function fetch(url, config) {
        return $.get(url, config).then(function(res) {
            return JSON.parse(res);
        });
    }

    /**
     * Get a project record by ID
     * 
     * @param {string} projectId 
     * @return {Promise->Project}
     */
    function getProject(projectId) {
        return fetch(this.basePath + '/project/' + projectId).then(function(res) {
            return res.Project;
        });
    }

    function getIterationsForProject(proj) {
        return fetch(proj.Iterations._ref)
            .then(function(res) {
                return res.QueryResult.Results;
            });
    }

    function getIteration(iterationId) {
        return fetch(this.basePath + '/iteration/' + iterationId).then(function(res) {
            return res.Iteration;
        });
    }

    function getIterationForStory(story) {
        return fetch(story.Iteration._ref).then(function(res) {
            return res.Iteration;
        });
    }

    function getStoriesForProject(proj) {

        var querystring = $.param({
            order: 'Iteration.StartDate',
            fetch: true,
            pagesize: 200,
            start: 1,
            project: proj._ref
        });

        return fetch(this.basePath + '/hierarchicalrequirement?' + querystring).then(function(res) {
            return res.QueryResult.Results;
        });
    }

    function getProjects() {
        return fetch(this.basePath + '/project').then(function(res) {
            return res.QueryResult.Results;
        });
    }

    function hydrateList(list,type){
        var promiseList = [];    
        list.forEach(function(e,i,a){ 
            promiseList.push( fetch(e._ref).then(function(res){ 
                a[i] = res[type];    
            }));    
        });
        return promiseList;
    }

    function hydrateProjects(projects) {
        return hydrateList(projects,'Project');
    }

    function getReleasesForProject(project) {
        return fetch(project.Releases._ref).then(function(res) {
            return res.QueryResult.Results;
        });
    }

    function hydrateReleases(rels) {
        return hydrateList(rels,'Release');
    }

    function hydrateIterationsForProject(iterations) {
        return hydrateList(iterations,'Iteration');
    }
    
    

    function getRelease(relId) {
        return fetch(this.basePath + '/release/' + relId).then(function(res) {
            return res.Release;
        });
    }
}

if (typeof module !== 'undefined') {
    module.exports = RallyAPI;
}

/* global rally EJSC RALLY releaseDropdown queryArray */

function getParam(name, defaultVal) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.href);
    if (results == null)
        return defaultVal;
    else
        return results[1];
}

var workspaceId = getParam("workspaceId", "69587");
var projectId = getParam("projectId", "33197366");
var scopeUp = getParam("scopeUp", "false");
var scopeDown = getParam("scopeDown", "false");
var rallyDataSource;

var MAX_ITERATIONS = 99;
var ESTIMATION_UNIT = "Points";
var KEY_PATTERN = /[^a-zA-Z0-9]+/g;
var chart;
var iterationMap = new Array();
var estimateSeries = [];
var scopeSeries = [];
var queries = [];
var glblCount = 0;
var projectName;
var title = "Enhanced Release Burnup";
var SERIES_TITLE = "Series";
var TREND_LINE_TITLE = "Trend Line";
var SCOPE_LINE_TITLE = "Scope Line";

if (!Number.toFixed) {
    Number.prototype.toFixed = function(x) {
        var temp = this;
        temp = Math.round(temp * Math.pow(10, x)) / Math.pow(10, x);
        return temp;
    };
}

function formatDate(date) {
    var day = date.getDate();
    if (day < 10) {
        day = "0" + day;
    }
    var month = date.getMonth() + 1;
    if (month < 10) {
        month = "0" + month;
    }
    var year = date.getFullYear();

    return month + "/" + day + "/" + year;
}

function getTotalSum() {

   console.log('TRACE::getTotalSum()');

    //first put all start dates into array
    var sDate = new Array();
    for (var key in iterationMap) {
        sDate.push(iterationMap[key].startDate);
    }

    //sort dateArray
    sDate.sort(mdyOrdA);

    //now using sorted array, sum each iteration in order
    var totalSum = 0;
    var passedkey;
    for (var i = 0; i < sDate.length; i++) {
        for (var key in iterationMap) {
            if (iterationMap[key].startDate == sDate[i]) {
                totalSum += iterationMap[key].estimate;
                passedkey = key;
                break;
            }
        }

        //finally set estimates to series
        for (var j = 0; j < estimateSeries.length; j++) {
            if (estimateSeries[j][0] == iterationMap[passedkey].name) {
                estimateSeries[j][1] = totalSum;
                break;
            }
        }
    }


}

function mdyOrdA(a, b) {
    var dateRE = /^(\d{2})[\/\- ](\d{2})[\/\- ](\d{4})/;
    a = a.replace(dateRE, "$3$1$2");
    b = b.replace(dateRE, "$3$1$2");
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
}

function drawChart(resultsMap) {
    console.log('TRACE::drawChart()');

    if (typeof chart !== "undefined") {
        chart.remove();
    }

    var sum = 0;
    var count = 0;
    for (var key in resultsMap) {
        if (key != "errors" && key != "warnings") {
            var stories = resultsMap[key];
            var estimate = 0;
            for (var i = 0; i < stories.length; i++) {
                var story = stories[i];
                estimate += story.PlanEstimate;
            }
            iterationMap[key].estimate = estimate;

            sum += estimate;
            if (estimate > 0) {
                count++;
            }
        }
    }

    //determine total sum for each iteration
    getTotalSum();

    chart = new EJSC.Chart("chart_div", {
        show_legend: false,
        show_titlebar: false,
        allow_zoom: false,
        proximity_snap: 10,
        axis_bottom: {
            caption: "Iterations",
            stagger_ticks: true,
            grid: {
                show: false
            },
            size: 40,
            crosshair: {
                show: true
            }
        },
        axis_left: {
            min_extreme: 0,
            caption: ESTIMATION_UNIT,
            crosshair: {
                show: true
            },
            minor_ticks: {
                show: true
            }
        }
    });

    var average = sum / count;
    average = average.toFixed(3);
    document.getElementById("average_div").innerHTML = "<strong>Average Velocity for last " +
        count + " non-zero iterations:</strong>&nbsp;&nbsp;&nbsp;" + average.toFixed(1) + " " + ESTIMATION_UNIT + "";



    var barSeries = new EJSC.BarSeries(
        new EJSC.ArrayDataHandler(estimateSeries), {
            title: SERIES_TITLE,
            color: "rgb(7,102,146)",
            y_axis_formatter: new EJSC.NumberFormatter({
                variable_decimals: 3
            })
        }
    );

    chart.addSeries(barSeries);

    if (count > 1) {
        var trendSeries = new EJSC.TrendSeries(
            barSeries,
            "linear", {
                title: TREND_LINE_TITLE,
                lineWidth: 1,
                color: "rgb(7,102,146)",
                opacity: 100,
                y_axis_formatter: new EJSC.NumberFormatter({
                    variable_decimals: 0
                })
            }
        );

        chart.addSeries(trendSeries);
    }

    var lineSeries = new EJSC.LineSeries(
        new EJSC.ArrayDataHandler(scopeSeries), {
            title: SCOPE_LINE_TITLE,
            color: "rgb(0,0,255)",
            lineWidth: 2
        }
    );
    chart.addSeries(lineSeries);

    chart.onShowHint = handleShowHint;

}

function handleShowHint(point, series, chart, hint, hoverOrSelect) {
    if (series.title == TREND_LINE_TITLE) {
        return "<strong>Accepted Points Trend</strong>";
    }
    else if (series.title == SERIES_TITLE) {
        var key = point.x.replace(KEY_PATTERN, "_");
        var startDate = RALLY.Mashup.Utilities.convertIsoDateOnly(iterationMap[key].startDate);
        var endDate = RALLY.Mashup.Utilities.convertIsoDateOnly(iterationMap[key].endDate);
        var productivity = (iterationMap[key].capacity > 0) ? iterationMap[key].estimate / iterationMap[key].capacity : 0;

        return "<strong>[x]</strong><br/><strong>Dates:</strong> " + formatDate(startDate) + " - " + formatDate(endDate) + "<br/>" +
            "<strong>Accepted:</strong> " + iterationMap[key].estimate + " " + ESTIMATION_UNIT + "<br/>" +
            "<strong>Capacity:</strong> " + iterationMap[key].capacity + " Hours<br/>" +
            "<strong>Productivity Rate:</strong> " + productivity.toFixed(3) + " " + ESTIMATION_UNIT + "/Hour";
    }
    else if (series.title == SCOPE_LINE_TITLE) {
        return "<strong>Scope:</strong> [y] ";
    }
    else {
        throw "Unrecognized series: " + series.title;
    }

}


function loadScopes(results) {
    console.log('TRACE::loadScopes()');

    if (results.stories.length == 0) {
        document.getElementById("chart_div").innerHTML = "No Stories for this project.";
        return;
    }
    if (glblCount == 0) {
        document.getElementById("chart_div").innerHTML = "User Iteration Capacities have not been defined (set these values on the Team Status page).";
        return;
    }

    // determine scopes per iteration
    for (var i = 0; i < results.stories.length; i++) {
        
        var story = results.stories[i];
        console.log( 'Processing story ' + story.Name );

        var relRemovedDate = null;

        //remove features and any double dipping in math
        var children = story.Children;
        if (children.length > 0) {
            continue;
        }

        if (story.Release == null) {
            console.log( "\thas no release");
            for (var j = 0; j < results.removedStories.length; j++) {
                if (results.removedStories[j].ObjectID == story.ObjectID) {
                    var rmvdStory = results.removedStories[j];

                    for (var h = 0; h < rmvdStory.RevisionHistory.Revisions.length; h++) {
                        var revision = rmvdStory.RevisionHistory.Revisions[h];

                        //When was i removed or was I ever added to a release?
                        if (revision.Description.indexOf("RELEASE removed") != -1 || revision.RevisionNumber == 0) {
                            relRemovedDate = revision.CreationDate;
                            break;
                        }
                    }
                }
            }
        }

        //add scope to iteration based on history
        for (var skey in iterationMap) {

            console.log( '\tfor ' + skey );
            //Was I born before this Iteration ended
            
            if(story.CreationDate <= iterationMap[skey].endDate) {
                
                console.log('\t\tcreatedBefore ' + iterationMap[skey].endDate + '=true' );

                //was the story removed from the release during this iteration?
                if (relRemovedDate == null || relRemovedDate > iterationMap[skey].endDate) {
                    console.log( '\t\tNOT removed during this iteration');
                    iterationMap[skey].scope += story.PlanEstimate;
                }
                else{
                    console.log( '\t\tremoved during this iteration');
                }
            }
            else{
                console.log('\t\tcreatedBefore ' + iterationMap[skey].endDate + '=false' );  
            }
        }
    }

    for (var key in iterationMap) {
        scopeSeries.unshift([iterationMap[key].name, iterationMap[key].scope]);
    }

    //scopes done load iteration details
    rallyDataSource.findAll(queries, drawChart);
}

function loadCapacities(results) {
    console.log('TRACE::loadCapacities()');


    if (results.iterations.length == 0) {
        document.getElementById("chart_div").innerHTML = "No Iterations for this release.";
        return;
    }

    var today = rally.sdk.util.DateTime.toIsoString(new Date());

    for (var i = 0; i < results.iterations.length && glblCount < MAX_ITERATIONS; i++) {
        var iteration = results.iterations[i];
        var userCapacities = iteration.UserIterationCapacities;
        var capacity = 0;

        for (var j = 0; j < userCapacities.length; j++) {
            capacity += userCapacities[j].Capacity;
        }

        var key = iteration.Name.replace(KEY_PATTERN, "_");

        iterationMap[key] = {
            name: iteration.Name,
            startDate: iteration.StartDate,
            endDate: iteration.EndDate,
            estimate: 0,
            scope: 0,
            capacity: capacity
        };

        var queryObject = {
            key: key,
            type: "HierarchicalRequirement",
            fetch: "PlanEstimate",
            query: "((Iteration.ObjectID = \"" + iteration.ObjectID + "\") AND (ScheduleState = \"Accepted\"))"
        };

        queries.unshift(queryObject);

        var tempEndDate = rally.sdk.util.DateTime.toIsoString(rally.sdk.util.DateTime.fromIsoString(iteration.EndDate));

        if (tempEndDate <= today) {
            estimateSeries.unshift([iteration.Name, 0]);
        }

        glblCount++;
    }


    var scopeQueries = [];

    //get ALL stories in project
    scopeQueries[0] = {
        key: "stories",
        type: "hierarchicalrequirement",
        fetch: "Name,ObjectID,PlanEstimate,CreationDate,Children,Release",
        query: "((Project.ObjectID = \"" + projectId + "\") AND ((Release.Name = \"" + releaseDropdown.getSelectedName() + "\") OR (Release = null)))"

    };
    //get only REMOVED stories in project
    scopeQueries[1] = {
        key: "removedStories",
        type: "hierarchicalrequirement",
        fetch: "ObjectID,RevisionHistory,Revisions",
        query: "((Project.ObjectID = \"" + projectId + "\") AND (Release = null))"

    };

    rallyDataSource.findAll(scopeQueries, loadScopes);
}

function runMainQuery(release_results) {
    console.log('TRACE::runMainQuery()');

    var queryObject = {
        key: "iterations",
        type: "Iteration",
        fetch: "Name,ObjectID,StartDate,EndDate,UserIterationCapacities,Capacity",
        order: "StartDate desc",
        query: "(((Project.ObjectID = \"" + projectId + "\") AND (StartDate >= " + release_results.release[0].ReleaseStartDate + ")) AND (EndDate <= " + release_results.release[0].ReleaseDate + "))"
    };

    console.log('running main query ' + queryObject.query);

    rallyDataSource.findAll(queryObject, loadCapacities);
}

function processWorkspaceQuery(query_result) {
    console.log('TRACE::processWorkspaceQuery()');

    console.log(JSON.stringify(query_result,null,2 ) );

    projectName = query_result.currentProject[0].Name;

    title = projectName + " " + title;
    document.getElementById("title").innerHTML = title;

    var releaseObject = {
        key: "release",
        type: "Release",
        fetch: "Name,ObjectID,ReleaseStartDate,ReleaseDate",
        order: "ReleaseStartDate desc",
        query: "((Project.ObjectID = \"" + projectId + "\") AND (Name = \"" + releaseDropdown.getSelectedName() + "\"))"
    };

    console.log('process workspace query ' + releaseObject.query);

    rallyDataSource.findAll(releaseObject, runMainQuery);
}

function runWorkspaceQuery() {
    console.log('TRACE::runWorkspaceQuery');

    queryArray = [];
    queryArray[0] = {
        key: 'user',
        type: 'user',
        fetch: 'loginname'
    };
    queryArray[1] = {
        key: 'workspaceStuff',
        placeholder: '${user.subscription.workspaces?fetch=ObjectID,Name,State,Style}'
    };
    queryArray[2] = {
        key: 'currentProject',
        type: 'projects',
        fetch: 'Name',
        query: '(ObjectId = ' + projectId + ')'
    };

    console.log('running workspace query ');

    rallyDataSource.findAll(queryArray, processWorkspaceQuery);
}

function processProjectName(query_result) {
    console.log('TRACE::processProjectName()');
    console.log(query_result);

    projectName = "RF Data Repository"; // query_result.currentProject[0].Name
    document.getElementById("title").innerHTML = title;
    document.getElementById("chart_div").innerHTML = "No Releases for " + projectName;


}




function getProjectName() {
    console.log('TRACE::getProjectName()');
    queryArray = [];
    queryArray[0] = {
        key: 'currentProject',
        type: 'projects',
        fetch: 'Name',
        query: '(ObjectId = ' + projectId + ')'
    };

    console.log('getProjectName ' + queryArray[0].query);

    rallyDataSource.findAll(queryArray, processProjectName);
}


function gotReleases(dropdown, eventArgs) {
    console.log('TRACE::gotReleases()');

    iterationMap = new Array();
    estimateSeries = [];
    scopeSeries = [];
    queries = [];
    glblCount = 0;


    if (dropdown.getItems().length > 0) {

        document.getElementById("chart_div").innerHTML = "<div><img alt='Progress' src='/slm/images/icon_spinner.gif' /><em>loading chart, may take a minute or two...</em></div>";
        document.getElementById("average_div").innerHTML = "";
        runWorkspaceQuery();
    }
    else {
        getProjectName();
    }
}


function onLoad() {
    console.log('TRACE::onLoad()');

    rallyDataSource = new rally.sdk.data.RallyDataSource(workspaceId, projectId, scopeUp, scopeDown);

    var config = {
        label: "Select a release "
    };
    releaseDropdown = new rally.sdk.ui.ReleaseDropdown(config, rallyDataSource);
    releaseDropdown.display("releaseDiv", gotReleases);
}

rally.addOnLoad(onLoad);

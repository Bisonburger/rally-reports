/* global google */
'use strict';

(function() {

	var release = {};
	var currentProject = {};
	var iterations = [];
	var stories = [];
	var recycle = [];

	var chart = {};

	//var scope = [315, 315, 328, 359, 390, 484, 439, 457, 457, 481, 486, 525, 551, 569, 603];


	var wsapiURL = 'https://agile.rms.ray.com/slm/webservice/v2.0/{0}?order={1}&fetch={2}&pagesize={3}&start={4}&query={5}';

	// String format
	if (!String.prototype.format) {
		String.prototype.format = function() {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function(match, number) {
				return typeof args[number] != 'undefined' ? args[number] : match;
			});
		};
	}

	$.ajaxSetup({
		type: 'GET',
		dataType: "json",
		xhrFields: {
			withCredentials: true
		}
	});

	init();

	///////////////////////////////////////////////////

	function init() {

		var config = {
			packages: ['corechart', 'line', 'bar']
		};
		
		google.charts.load('current', config );
		
		getProjectInfo('33197366')
			.then( getReleaseInfo('33197366', 'Beta Release') )
			.then( getIterations('33197366') )
			.then( getStories('33197366', 'Beta Release') )
			.then( getChangesToStory('33197366', 'Beta Release') )
			.then( drawChart );
	}

	function generateTooltip(iteration) {
		return '<div style="width: 280px; background-color: #FFFFFF">' +
			'<div class="bv-iteration-title" style="border-bottom:2pt solid black;font-weight: bold;font-size: 12pt;">' +
			iteration.Name + '</div>' +
			'<table class="bv-iteration-details-table" style="margin-bottom: 0.5em; border-collapse: collapse;">' +
			'<tr><td style="font-weight: bold;font-size: 11pt;">Dates:</td>' +
			'<td style="font-size: 10pt;">10-10-2016 - 10-12-2016</td></tr>' +
			'<tr><td style="font-weight: bold;font-size: 11pt;color: #3465AA;">Accepted</td>' +
			'<td style="font-size: 10pt;color: #3465AA;">' + iteration.PlanEstimate + ' points</td></tr>' +
			'<tr><td style="font-weight: bold;font-size: 11pt;color: #808080;">Capacity:</td>' +
			'<td style="font-size: 10pt;color: #808080;">' + iteration.Capacity + ' hrs</td></tr>' +
			'<tr><td style="font-weight: bold;font-size: 11pt;color: #808080;">Productivity Rate:</td>' +
			'<td style="font-size: 10pt;color: #808080;">' + iteration.ProductivityRate + ' points/hr</td></tr>' +
			'</table></div>';
	}

	function sumPlannedAsofIteration(iteration) {
		var sumPlanned = 0;
		var count = 0;
		for (var i in stories) {
			var story = stories[i];
			var iterationEnd = new Date(iteration.EndDate);
			var storyCreated = new Date( story.CreationDate );
			if (storyCreated.getTime() <= iterationEnd.getTime() && story.Release != null ) {
				sumPlanned += story.PlanEstimate;
				count += 1;
			}
			else {
				console.log('REJECTED {0} for {1}: Story Date was {2} and Iteration Ended {3}'.format(story.Name, iteration.Name, story.AcceptedDate, iteration.EndDate));
			}
		}
		console.log('For iteration {0}:  {1} stories; {2} points'.format(iteration.Name, count, sumPlanned) );
		return sumPlanned;

	}

	function averageVelocity(startWith) {
		var count = 0;
		var sum = 0;
		for (var i = startWith; i >= 0; i--)
			if (iterations[i].PlanEstimate && iterations[i].PlanEstimate >= 0) {
				count += 1;
				sum += iterations[i].PlanEstimate;
			}
		return count === 0 ? 0 : (sum / count).toFixed(3);
	}

	function buildChartData() {
		var data = new google.visualization.DataTable();
		data.addColumn('number', 'Sprints');
		data.addColumn('number', 'PlanEstimate');
		data.addColumn({
			'type': 'string',
			'role': 'tooltip',
			'p': {
				'html': true
			}
		});
		data.addColumn('number', 'Scope');

		var planEstimate = 0;
		var capacity = 0;
		var j = -1;
		iterations.forEach( function( iteration, i ){
			j += 1;
			planEstimate += iteration.PlanEstimate;
			capacity += iteration.Capacity;
			console.log('SumPlanned for {0} = {1}'.format( iteration.Name, sumPlannedAsofIteration(iteration)) );
			data.addRow([j, (i < 14) ? planEstimate : null, generateTooltip(iteration), sumPlannedAsofIteration(iteration)]);
		});
		return data;
	}

	function generateXLabels() {
		var ticks = [];
		iterations.forEach( function(iteration,i){
			ticks.push({
				v: i,
				f: iterations[i].Name
			});
		});
		return ticks;
	}

	function drawChart() {
		
		console.log( 'Drawing Chart' );
		var data = buildChartData();
		var options = {
			theme: 'material',
			curveType: 'function',
			legend: {
				position: 'right',
				textStyle: {
					fontSize: 12
				}
			},
			seriesType: 'bars',
			series: {
				1: {
					type: 'line'
				}
			},
			tooltip: {
				isHtml: true
			},
			vAxis: {
				title: 'Story Points',
				minValue: 0,
				maxValue: 650,
				titleTextStyle: {
					fontSize: 11,
					italic: false,
					bold: true
				},
				textStyle: {
					fontSize: 11,
					bold: true
				},
				ticks: [0, 100, 200, 300, 400, 500, 600,700]
			},
			hAxis: {
				baseline: -0.5,
				minValue: -0.5,
				maxValue: iterations.length + 1,
				gridlines: {
					color: '#FFFFFF'
				},
				title: 'Iterations',
				titleTextStyle: {
					fontSize: 11,
					italic: false,
					bold: true
				},
				textStyle: {
					fontSize: 11,
					bold: true
				},
				ticks: generateXLabels()
			},
			height: 500,
			trendlines: {
				0: {
					type: 'linear',
					color: 'green',
					lineWidth: 3,
					opacity: 0.3,
					showR2: false,
					visibleInLegend: true,
					labelInLegend: 'Accepted Points Trend'
				}
			},
			axes: {
				x: {
					0: {
						side: 'bottom'
					}
				}
			}
		};
		var view = new google.visualization.DataView(data);
		chart = new google.visualization.ComboChart(document.getElementById('chartContainer'));
		chart.draw(view, options);
		document.getElementById('title').innerHTML = currentProject.Name + ' Enhanced Release Burnup';
		document.getElementById('averageVelocity').innerHTML = averageVelocity(14);
	}

	function getProjectInfo(projectId) {
		return queryRally({
				type: "Project",
				id: projectId,
			})
			.done(function(res) {
				currentProject = res.Project;
			})
			.fail(handleQueryFailed);
	}

	function getReleaseInfo(projectId, releaseName) {
		return queryRally({
				projectId: projectId,
				type: "Release",
				fetch: "Name,ReleaseStartDate,ReleaseDate",
				order: "ReleaseStartDate desc",
				query: "(Name = \"{0}\")".format( releaseName )
			})
			.done(function(res) {
				release = res.QueryResult.Results[0];
			})
			.fail(handleQueryFailed);
	}
	
	function hydrateRevisions(story){
		$.ajax(story.RevisionHistory.Revisions._ref)
			.done( function(res){
				story.RevisionHistory.Revisions = res.QueryResult.Results;
			})
			.fail(handleQueryFailed);
	}
	
	function hydrateRevisionHistory(story){
		$.ajax(story.RevisionHistory._ref)
			.done( function(res){
				story.RevisionHistory = res.RevisionHistory;
				hydrateRevisions(story);
			})
			.fail(handleQueryFailed);
	}

	function hydrateUserIterationCapacities(iteration) {
		$.ajax(iteration.UserIterationCapacities._ref)
			.done(function(res) {
				iteration.UserIterationCapacities = res.QueryResult.Results;
				iteration.Capacity = 0;
				iteration.ProductivityRate = 0;
				iteration.UserIterationCapacities.forEach( function(iterationCapacity){
					iteration.Capacity += iterationCapacity.Capacity;	
				} );
				if (iteration.Capacity > 0) iteration.ProductivityRate = (iteration.PlanEstimate / iteration.Capacity).toFixed(3);
			})
			.fail(handleQueryFailed);
	}

	function getIterations(projectId) {
		return queryRally({
				projectId: projectId,
				type: "Iteration",
				fetch: "Name,ObjectID,StartDate,EndDate,PlanEstimate,UserIterationCapacities",
				order: "StartDate"
			})
			.done(function(res) {
				iterations = res.QueryResult.Results;
				iterations.forEach( hydrateUserIterationCapacities );
			})
			.fail(handleQueryFailed);
	}

	function getStories(projectId, releaseName) {
		return queryRally({
				projectId: projectId,
				query: "((Release.Name = \"{0}\") OR (Release = null))".format( releaseName )
			})
			.done(function(res) {
				stories = res.QueryResult.Results;
				stories.forEach( hydrateRevisionHistory );
			})
			.fail(handleQueryFailed);
	}

	function getChangesToStory( projectId, releaseName, story ){
		return queryRally({
			type: "recyclebinentry",
			projectId: projectId,
			query: "(Release.Name = \"{0}\")",
			show: true
		})
		.done( function(res){
			recycle = res;
			console.log(recycle);
		});
	}
	
	/**
	 * queryRally
	 * 
	 * Sets up and executes a async AJAX call to the Rally Store, with a query.  
	 */
	function queryRally(config) {

		// default configuration
		var type = config.type || 'hierarchicalrequirement';
		var order = config.order || '';
		var fetch = config.fetch || true;
		var pagesize = config.pageSize || 200;
		var start = config.start || 1;
		var projectId = config.projectId;
		var query = config.query || '';
		var id = config.id;
		var show = config.show || false;

		if (id)
			type = type + "/" + id;

		if (!start || start <= 1) {
			var url = wsapiURL.format(type, order, fetch, pagesize, start, query);
			if (!id && projectId)
				url = url + '&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/' + projectId;
		}
		show && console.log( url );
		return $.ajax(url);
	}

	function handleQueryFailed(response) {
		console.error(response);
	}


})();
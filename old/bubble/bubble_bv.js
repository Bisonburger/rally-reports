/**
 * BubbleBVHandler
 * 
 * Handles the controls and interaction for the BusinessValueApp 
 * 
 * @param {Rally.app.App}
 */

/* global Rally */
/* global Ext */

function BubbleBVHandler(app) {

	/******************************************
	 * Private members
	 ******************************************/
	// for testing locally - no query against the datastore, local files only
	this.LOCAL = true;

	// print debug info to the console
	this.DEBUG = true;

	// Rally application object to handle
	this.app = app;

	// Current application context
	this.context = undefined;

	// list of UserStory fields to fetch within the query
	this.FETCH_COLS = ['Name', 'c_BusinessValue', 'PlanEstimate', 'Iteration', 'ScheduleState', 'Release'];

	// Name of the property (from the UserStory) to use for the summary statistics
	this.SUMMARY_COL = 'c_BusinessValue';
	//this.SUMMARY_COL = 'PlanEstimate';

	// base Rally WS API URL
	// {0} is a placeholder for the UserStory fields to fetch  
	// {1} start index of the fetch (first record starts at 1, not 0!)
	// {2} (see QUERY_ALL and QUERY_RELEASE) is the project OID
	// {3} (see QUERY_RELEASE) is the name of the selected release (used in a release is selected, otherwise uses QUERY_ALL)
	// note that currently, the max pagesize is 200; causing some 'magic' to appear to fetch all the records
	// note that the query parameter is "VERY FRAGILE" - requiring spaces, etc. -- take care when modifying
	// FYI - one such quirk is that the operators must have space around them - e.g. Project.OID = '123' not Project.OID='123'
	// @see https://help.rallydev.com/grid-queries
	this.WSAPI_URL = 'https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?order=Iteration.StartDate&fetch={0}&pagesize=200&start={1}';

	// query all releases
	this.QUERY_ALL = '&query=(Project.OID = "{2}")';

	// query a specific release - by name
	this.QUERY_RELEASE = '&query=((Project.OID = "{2}") AND (Release.Name = "{3}"))';

	// drop down text for querying all releases
	this.QUERY_ALL_TEXT = 'ALL RELEASES';

	// Results array (array of userStories) from the query
	this.queryResults = [];

	// Rally.ui.chart.Chart object
	this.chart = undefined;

	/******************************************
	 * Private methods
	 ******************************************/
	 
	this.lookupIteration = function( iteration, scope ){
		var me = scope || this;
		for (var idx in me.queryResults) {
			var story = me.queryResults[idx];
			if( story.Iteration && story.Iteration.Name === iteration ){
				return story.Iteration;
			}
		}
		return undefined;
	}

	/**
	 *  buildData
	 * 
	 */
	this.buildData = function(scope) {
		var me = scope || this;

		var sumPlanned = me.sumFieldByIterations("PlanEstimate", scope);
		var sumBV = me.sumFieldByIterations("c_BusinessValue", scope);

		var maxPlanned = Ext.Array.max(sumPlanned.getValues());
		var minPlanned = Ext.Array.min(sumPlanned.getValues());
		var maxBV = Ext.Array.max(sumBV.getValues());;
		var minBV = Ext.Array.min(sumBV.getValues());

		var keys = sumBV.getKeys();

		var data = [];
		for (var idx = 0; idx < sumPlanned.length; idx++) {
			var iteration = me.lookupIteration( keys[idx], scope );
			var startDate = new Date( iteration.StartDate );
			var endDate = new Date( iteration.EndDate );

			var diff = iteration && Rally.util.DateTime.getDifference( endDate, startDate, 'day') || 1 ;
			data.push({
				"x": sumBV.get(keys[idx]),
				"y": sumPlanned.get(keys[idx]),
				"z": Math.floor(Math.random() * 30) + 1,
				"name": keys[idx],
				"fullName": 'Sprint ' + keys[idx].substring(1),
				"startDate": iteration && Ext.Date.format( startDate, 'Y-m-d' ) || '?',
				"endDate": iteration && Ext.Date.format( endDate, 'Y-m-d') || '?',
				"marker": {
					fillColor: '#3465AA',
					lineColor: '#3465AA'
				}
			});
		}
		me.initializeChart(data, maxPlanned, minPlanned, maxBV, minBV, scope);
	}

	/**
	 * sumFieldByIterations
	 * 
	 */
	//TODO:  do this by fields vs. one field at a time...
	this.sumFieldByIterations = function(field, scope) {
		var sumMap = new Ext.util.HashMap();

		var me = scope || this;

		for (var idx in me.queryResults) {
			var story = me.queryResults[idx];
			var key = (story.Iteration) ? story.Iteration.Name : "Unassigned";
			var value = (sumMap.get(key) || 0) + ( story.Iteration && story.Iteration[field] || 0);
			if (key !== "Unassigned")
				sumMap.replace(key, value);
		}
		return sumMap;
	}

	/**
	 * buildURL
	 * 
	 * Builds the query URL to fetch UserStories from the Rally Store.  Assumes this is being done for
	 *   the current project as found in the context
	 *
	 * @return URL (as a string) which will fetch the first 200 records
	 */
	this.buildURL = function(start) {
		this.DEBUG && console.log('building the query URL');
		// get the current project OID
		var projOid = Rally.util.Ref.getRefObject(this.context.getProject()._ref).getOid();

		// build query for the currently selected release        		
		var releaseRecord = this.releaseCombobox && this.releaseCombobox.getRecord();
		var release = ((releaseRecord && releaseRecord.data.Name) || this.QUERY_ALL_TEXT);
		var strUrl = this.WSAPI_URL.concat((release === this.QUERY_ALL_TEXT) ? this.QUERY_ALL : this.QUERY_RELEASE);

		return Ext.String.format(strUrl, this.FETCH_COLS.join(','), (start || 1), projOid, release);
	};

	/**
	 * hasQueryErrors
	 * 
	 * Determine if the response is a 'query has errors' message
	 * 
	 * @param response raw HTML response message
	 * @return true if its an error message; false otherwise
	 */
	this.hasQueryErrors = function(response) {
		var retValue = false;
		if (response && response.responseText && response.status && response.status == 200) {
			var json = Ext.JSON.decode(response.responseText);
			retValue = json.QueryResult && json.QueryResult.Errors && json.QueryResult.Errors.length > 0;
		}

		return retValue;
	};

	/**
	 * hasQueryResults
	 * 
	 * determine if the response has any results (include 0 returned rows)
	 * 
	 * @param response raw HTML response message
	 * @return true if its a valid response object; false otherwise
	 */
	this.hasQueryResults = function(response) {
		var retValue = false;
		if (response && response.responseText) {
			var json = Ext.JSON.decode(response.responseText);
			retValue = json.QueryResult && json.QueryResult.Results;
		}

		return retValue;
	};

	/**
	 * nextStart
	 * 
	 * Determines the next starting record index (1 based) from the current response
	 *
	 * @param response raw HTML response message
	 * @return next starting index (1 based); returns 0 if all records have been fetched
	 */
	this.nextStart = function(response) {
		var retValue = 0;
		var queryResult = Ext.JSON.decode(response.responseText).QueryResult;
		var startIndex = queryResult.StartIndex || 1;
		var pageSize = queryResult.PageSize || 0;
		var total = queryResult.TotalResultCount || 0;
		retValue = startIndex + pageSize;

		return (retValue > total) ? 0 : retValue;
	};


	/**
	 * processIterationDetails
	 * 
	 */
	this.processIterationDetails = function(callback) {
		var iterations = [];

		for (var idx in this.queryResults) {
			var iteration = this.queryResults[idx].Iteration;
			iteration && iterations.push(iteration);
		}

		for (var idx in iterations) {
			var iteration = iterations[idx];
			var done = 0;
			if (iteration && iteration._ref) {
				this.DEBUG && console.log(Ext.String.format('calling {0}', iteration._ref));
				Ext.Ajax.request({
					scope: this,
					url: iteration._ref,
					method: 'GET',
					withCredentials: true,
					idx: idx,
					callback: (function(options, success, response) {
						done += 1;
						if (success) {
							options.scope.queryResults[options.idx].Iteration = Ext.JSON.decode(response.responseText).Iteration;
							if (callback && (done >= iterations.length)) {
								callback(options.scope); // pass the scope out to the callback
							}
						}
						else {
							options.scope.DEBUG && console.log(Ext.String.format('had an issue processing {0};', options.idx));
						}
					})
				})
			}
		}
	}

	/**
	 * processQueryResults
	 * 
	 * Callback to processes the raw response returned from the Rally Store query and determine if  
	 * 	additional queries are required (based on page size)
	 *
	 * @param response raw HTML response message
	 */
	this.processQueryResults = function(response) {
		this.DEBUG && console.log(Ext.String.format('query results queue has {0} items',
			this.queryResults.length));
		if (!this.hasQueryErrors(response)) { // make sure we didn't get errors in the query    	
			// get the results from the response and add them to the overall query results
			var currentResults = Ext.JSON.decode(response.responseText).QueryResult.Results;
			Array.prototype.push.apply(this.queryResults, currentResults);
			this.DEBUG && console.log(Ext.String.format('adding {0} items to queryResults',
				this.queryResults.length));
			var start = this.nextStart(response); // find the next start index
			this.DEBUG && console.log(Ext.String.format('nextStartIndex for query = {0}', start));
			if (start > 0) { // we dont have it all - query for the next 'page'
				this.DEBUG && console.log("we dont have it all - query for the next 'page'");
				this.queryRallyStore(start);
			}
			else { // we've got it all - process the iteration detail and build the chartData
				this.processIterationDetails(this.buildData);
			}
		}
		else { // handle this as part of the failure process
			this.queryFailed(response);
		}
	};

	/**
	 * queryFailed
	 * 
	 * Callback invoked when the main RallyDev query fails; either by Ajax/Network issues or
	 * 	via some errors in the query/store itself
	 *
	 * @param response raw HTML response message
	 */
	this.queryFailed = function(response) {
		if (this.hasQueryErrors(response)) { // we got an HTML response but the query itself had issues

			var errors = Ext.JSON.decode(response.responseText).QueryResult.Errors; // safe since we're in hasQueryErrors
			for (var idx in errors) {
				this.DEBUG && console.log(Ext.String.format('Query Error ** {0}',
					errors[idx]));
				Rally.ui.notify.Notifier.showError({
					toFrontOnShow: true,
					region: 'south',
					message: errors[idx] || "A general query error has occurred"
				});
			}
		}
		else { // Ajax/network issues
			this.DEBUG && console.log(response);
			Rally.ui.notify.Notifier.showError({
				toFrontOnShow: true,
				region: 'south',
				message: response.responseText || "A general network error has occurred"
			});
		}
	};


	/**
	 * initializeChart
	 * 
	 * Initialize the Rally chart object
	 */
	this.initializeChart = function(data, maxY, minY, maxX, minX, scope) {

		console.log(Ext.String.format("maxX={0}; minX={1}; maxY={2}; minY={3}", maxX, minX, maxY, minY));
		var me = scope || this;

		me.TRACE && console.log('initializing the chart object');

		me.ProjOid = (me.LOCAL) ? 53678 :
			Rally.util.Ref.getRefObject(me.context.getProject()._ref).getOid();


		me.chart = new Rally.ui.chart.Chart({
			chartData: {
				series: [{
					"data": data
				}]
			},
			chartConfig: {
				chart: {
					type: 'bubble',
					borderWidth: 1,
				},

				legend: {
					enabled: false
				},

				title: {
					text: 'Planned Effort vs. Business Value'
				},

				subtitle: {
					text: 'Project:  {Project name here}'
				},

				xAxis: {
					max: maxX + 4,
					min: minX - 4,
					gridLineWidth: 0,
					minorGridLineWidth: 0,
					tickInterval: 1,
					title: {
						text: 'Business Value'
					},
					plotLines: [{
						color: '#000000',
						width: 2,
						value: (maxX + minX) / 2,
						dashStyle: 'dot'
					}],
				},

				yAxis: {
					max: maxY + 4,
					min: minY - 4,
					gridLineWidth: 0,
					minorGridLineWidth: 0,
					tickInterval: 1,
					title: {
						text: 'Planned Effort'
					},
					plotLines: [{
						color: '#000000',
						width: 2,
						value: (maxY + minY) / 2,
						dashStyle: 'dot'
					}],
				},

				tooltip: {
					useHTML: true,
					headerFormat: '<table>',
					pointFormat: '<tr><th colspan="2"><h3>{point.fullName} ({point.startDate} to {point.endDate})</h3></th></tr>' +
						'<tr><th>Business Value:</th><td>{point.x} business value points</td></tr>' +
						'<tr><th>Planned Effort:</th><td>{point.y} story points</td></tr>' +
						'<tr><th>Planned Duration:</th><td>{point.z} days</td></tr>',
					footerFormat: '</table>',
					followPointer: true
				},
				plotOptions: {
					series: {
						dataLabels: {
							enabled: true,
							format: '{point.fullName}',
							color: '#000000',
							shadow: false
						}
					}
				},
			}
		});
		me.app.add(me.chart);
	};

	/**
	 * queryRallyStore
	 * 
	 * Sets up and executes a async AJAX call to the Rally Store, with a query.  On success, 
	 * will execute processQueryResults(), on failure will execute queryFailed()
	 * 
	 * @param start
	 */
	this.queryRallyStore = function(start) {

		var url = (this.LOCAL) ? 'QueryResult.json' : this.buildURL(start);

		if (!start || start <= 1) {
			this.DEBUG && console.log('resetting query results queue');
			this.queryResults = [];
		}

		this.DEBUG && console.log(Ext.String.format(
			'Calling rally query with {0}', url));
		Ext.Ajax.request({
			scope: this,
			url: url,
			method: 'GET',
			withCredentials: true,
			headers:{
				'Access-Control-Allow-Credentials': true,
				'Access-Control-Allow-Origin' : '*',
				'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
  				'Access-Control-Allow-Headers': 'Content-Type'
			},
			success: this.processQueryResults,
			failure: this.queryFailed
		});
	};

	/******************************************
	 * Constructor body
	 ******************************************/
	this.context = (this.LOCAL)? undefined : app.getContext();
	this.queryRallyStore();
}


/******************************************
 * Public methods
 ******************************************/
BubbleBVHandler.prototype = {
	constructor: BubbleBVHandler,

	getChart: function() {
		return this.chart;
	}
};

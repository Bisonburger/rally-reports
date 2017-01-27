
/**
 * BusinessValueHandler
 * 
 * Handles the controls and interaction for the BusinessValueApp 
 * 
 * @param {Rally.app.App}
 */

/* global Rally */
/* global Ext */
/* global google */
/* global onresize */

BusinessValueHandler = function BusinessValueHandler() {


	/******************************************
	 * Private members
	 ******************************************/
	// for testing locally - no query against the datastore, local files only, or preset projects
	this.LOCAL = false;
	//this.projectId = "252613";
	//this.projectName = "ETA";
	//this.projectId = '32845313'; this.projectName = 'ACAT';
	//this.projectId = '33723291'; this.projectName = 'AFT';
	//this.projectId = '14099958'; this.projectName = 'ANT';
	//this.projectId = '25145387'; this.projectName = 'BSAR';

	// print debug info to the console
	this.DEBUG = true;

	// never display the projected/forecast line or checkbox
	this.ALWAYS_HIDE_PROJECTED = true;

	// Rally application object to handle
	this.app = undefined;
	
	this.chartData = undefined;
	this.chartOptions = undefined;

	// Current application context
	this.context = undefined;

	// Name of the property (from the UserStory) to use for the summary statistics
	this.SUMMARY_COL = 'c_BusinessValue';

	// base Rally WS API URL
	// {0} is a placeholder for the UserStory fields to fetch  
	// {1} start index of the fetch (first record starts at 1, not 0!)
	// {2} (see QUERY_ALL and QUERY_RELEASE) is the project OID
	// {3} (see QUERY_RELEASE) is the name of the selected release (used in a release is selected, otherwise uses QUERY_ALL)
	// note that currently, the max pagesize is 200; causing some 'magic' to appear to fetch all the records
	// note that the query parameter is "VERY FRAGILE" - requiring spaces, etc. -- take care when modifying
	// FYI - one such quirk is that the operators must have space around them - e.g. Project.OID = '123' not Project.OID='123'
	// @see https://help.rallydev.com/grid-queries
	this.WSAPI_URL = 'https://agile.rms.ray.com/slm/webservice/v2.0/hierarchicalrequirement?' +
					 'order=Iteration.StartDate&fetch=true&pagesize=200&start={0}' +
					 '&project=https://agile.rms.ray.com/slm/webservice/v2.0/project/{1}';

	// query a specific release - by name
	this.QUERY_RELEASE = '&query=(Release.Name = "{2}")';

	// drop down text for querying all releases
	this.QUERY_ALL_TEXT = 'ALL RELEASES';

	// Results array (array of userStories) from the query
	this.queryResults = [];

	// Rally.ui.chart.Chart object
	this.chart = undefined;

	// Rally.ui.combobox.ReleaseCombobox object
	this.releaseCombobox = undefined;

	// Rally.ui.CheckboxField
	this.projectedCheckbox = undefined;
	
	this.message = undefined; 

	/******************************************
	 * Private methods
	 ******************************************/

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
		var projOid = this.projectId || Rally.util.Ref.getRefObject(this.context.getProject()._ref).getOid();

		this.DEBUG && console.log('projectOid = ' + projOid);

		// build query for the currently selected release        		
		var releaseRecord = this.releaseCombobox && this.releaseCombobox.getRecord();
		var release = ((releaseRecord && releaseRecord.data.Name) || this.QUERY_ALL_TEXT);
		var strUrl = (release === this.QUERY_ALL_TEXT) ? this.WSAPI_URL : this.WSAPI_URL.concat(this.QUERY_RELEASE);

		return Ext.String.format(strUrl, start || 1, projOid, release);
	};

	/**
	 * onChangedRelease
	 * 
	 * Triggered on a change to the release dropdown or the projectedCheckbox
	 */
	this.onChanged = function() {
		this.DEBUG && console.log( 'Release combobox changed' );
		this.queryRallyStore(); // query the store for the data
	};
	
	/**
	 * on_resize
	 */


	this.initializeChart = function(scope, data) {
		var me = scope || this;

		me.DEBUG && console.log('creating the chart object');

		var fieldName = Ext.String.startsWith(this.SUMMARY_COL, 'c_') ? this.SUMMARY_COL.substring(2) : this.SUMMARY_COL;

		fieldName = fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, function(str) {
			return str.toUpperCase();
		});

		var options = {
			title: Ext.String.format('Business Value Burn Up\nfor {0}', (this.LOCAL) ? 'Local Project' : this.context.getProject().Name),
			backgroundColor: 'white',
			legend: {
				position: 'top',
				textStyle: { fontSize: 12 }
			},
			animation:{
				startup: true	
			},
			focusTarget: 'datum',
    		tooltip: { isHtml: true },
			series: {
				0: {color: '#E8D7AB', lineWidth: 2}, // planned
				1: {color: '#3465AA', lineWidth: 3}  // actual
			},
			pointsVisible: true,
			height: 500,
			vAxis: { title: 'Business Value\n% Complete', maxValue: 100, minValue:0, 
				ticks: [ { v:0, f:'0%'},
						 { v:10, f:'10%'},
						 { v:20, f:'20%'},
						 { v:30, f:'30%'},
						 { v:40, f:'40%'}, 
						 { v:50, f:'50%'},
						 { v:60, f:'60%'},
						 { v:70, f:'70%'},
						 { v:80, f:'80%'},
						 { v:90, f:'90%'},
						 { v:100, f:'100%'}] ,
			   titleTextStyle: { fontSize: 11, italic: false, bold: true },
			   textStyle: { fontSize: 11, bold: true }
			},
			hAxis: { 
				title: 'Iterations', 
				titleTextStyle: { fontSize: 11, italic: false, bold: true },
				textStyle: { fontSize: 11, bold: true }
			}
		};

		var chartContainer = me.app.down('#chartContainer').getEl().dom;
		me.chart = new google.visualization.LineChart(chartContainer);

		/*
		google.visualization.events.addListener(me.chart, 'ready', function() {
			me.initializeReleaseCombobox(me);
		});
		*/

		me.DEBUG && console.log('saving chart data and options' );
		me.chartData = data;
		me.chartOptions = options;
		
		me.chart.draw(data, options);
		
		if (!me.ALWAYS_HIDE_PROJECTED) {
			me.DEBUG && console.log('hiding the checkbox');
			me.projectedCheckbox.hide();
		}
		if( me.message ){
			me.DEBUG && console.log('Closing waiting dialog' );
			me.message.close();
		}
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
	 * buildChartData
	 * 
	 * Builds the chart data objects (categories and series) from the raw query results stored in
	 *  queryResults (which is expected to be an array of UserStories)
	 */
	this.buildChartData = function(scope) {
		var planned = new Ext.util.HashMap();
		var actual = new Ext.util.HashMap();
		var allIter = new Ext.util.HashMap();

		var me = scope || this;

		me.DEBUG && console.log(Ext.String.format('A total of {0} user stories were found',
			me.queryResults.length || 0));

		// build keystore of business value sums per iteration
		for (var idx in me.queryResults) {
			var story = me.queryResults[idx];
			var iter = story.Iteration; // get the Iteration tag, if not present call it 'none'
			if (iter != undefined) {
				var startDate = Rally.util.DateTime.format(new Date(iter.StartDate), 'm/d/Y');
				var endDate = Rally.util.DateTime.format(new Date(iter.EndDate), 'm/d/Y');
				allIter.add( iter.Name, {'start': startDate, 'end':endDate} );
				var completed = (story.ScheduleState === 'Accepted' || story.ScheduleState === 'Completed') ? 1 : 0;
				//var dt = new Date(iter.EndDate);
				var key = iter.Name;

				var aReplaceValue = completed * ((actual.get(key) || 0) + (story[me.SUMMARY_COL] || 0));
				var pReplaceValue = ((planned.get(key) || 0) + (story[me.SUMMARY_COL] || 0));
				me.DEBUG && console.log(Ext.String.format('actual; set {0} = {1}', iter.Name, aReplaceValue));
				me.DEBUG && console.log(Ext.String.format('planned; set {0} = {1}', iter.Name, pReplaceValue));
				actual.replace(key, aReplaceValue);
				planned.replace(key, pReplaceValue);
			}
		}

		// build planned percent cumulatives
		var sumPlanned = Ext.Array.sum(planned.getValues());
		var cumulativePlanned = new Ext.util.HashMap();
		var lastPlannedValue = 0;
		planned
			.each(function(key, value) {
				lastPlannedValue += value;
				var replacement = Math.round(((lastPlannedValue / sumPlanned) * 100) * 1000000) / 1000000;
				cumulativePlanned.replace(key, replacement);
			});

		// build actual percentage cumulatives 
		var cumulativeActual = new Ext.util.HashMap();
		var lastActualValue = 0;
		var actualsCount = 0;
		actual.each(function(key, value) {
			lastActualValue += value;
			// we'll assume that if the value is 0 we don't have actuals
			// this may not be a safe assumption
			if (value && value > 0)
				actualsCount++;
			cumulativeActual.replace(key, (value > 0) ? (lastActualValue / sumPlanned) * 100 : null);
		});

		var data = new google.visualization.DataTable();
		data.addColumn('string', 'Iteration');
		data.addColumn('number', 'Planned');
		data.addColumn( {'type': 'string', 'role': 'tooltip', 'p': {'html': true}});
		data.addColumn('number', 'Actual');
		data.addColumn( {'type': 'string', 'role': 'tooltip', 'p': {'html': true}});

		var iterations = planned.getKeys();

		for (var idx in iterations) {
			var itr = iterations[idx];
			var actualVal = cumulativeActual.get(itr);
			var plannedVal = cumulativePlanned.get(itr);
			me.DEBUG && console.log(Ext.String.format('adding row [ {0}, {2}, {1} ]', itr, actualVal, plannedVal));
			data.addRow([itr+'\n'+allIter.get(itr).end, plannedVal, me.generateTooltip(itr,plannedVal,actualVal,allIter.get(itr).start,allIter.get(itr).end), 
							  actualVal, me.generateTooltip(itr,plannedVal,actualVal,allIter.get(itr).start,allIter.get(itr).end)]);
		}

		// make the chart visible and show it				
		me.DEBUG && console.log('making the chart visible and calling show()');
		me.initializeChart(scope, data);
	};

	this.generateTooltip = function(iter, planned, actual, start, end) {

		return '<div style="width: 200px; background-color: #FFFFFF">' +
			'<div class="bv-iteration-title" style="border-bottom:2pt solid black;font-weight: bold;font-size: 12pt;">' +
			'<img src="data:image/png;base64,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" style="margin-right:3px;width:16px;height:16px">' +
			iter + '</div>' +
			'<table class="bv-iteration-details-table" style="margin-bottom: 0.5em">' +
			'<tr><td style="font-weight: bold;font-size: 10pt;">Start:</td>' +
			'<td style="font-size: 10pt;">'+start+'</td></tr>' +
			'<tr><td style="font-weight: bold;font-size: 10pt;">End:</td>' +
			'<td style="font-size: 10pt;">'+end+'</td></tr>' +
			'</table>' +
			'<table class="bv-iteration-data-table" style="border-collapse: collapse;">' +
			'<tr><td style="font-weight: bold;font-size: 10pt;color: #3465AA;">Actual Value:</td>' +
			'<td style="font-size: 10pt;color: #3465AA;">' + Math.round(actual * 100) / 100 + '%&nbsp;</td></tr>' +
			'<tr><td style="font-weight: bold;font-size: 10pt;color: #808080;">Planned Value:</td>' +
			'<td style="font-size: 10pt;color: #808080;">' + Math.round(planned * 100) / 100 + '%&nbsp;</td></tr>' +
			'</table>' +
			'</div>';
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
				this.processIterationDetails(this.buildChartData);
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
	 * initializeReleaseCombobox
	 * 
	 * Initialize the Rally Releases Dropdown
	 */
	this.initializeReleaseCombobox = function(scope) {

		var me = scope || this;

		//if (me.LOCAL || me.projectId || me.releaseCombobox) return;

		me.releaseCombobox = new Rally.ui.combobox.ReleaseComboBox({
			allowClear: false,
			clearText: me.QUERY_ALL_TEXT,
			fieldLabel: 'Release:',
			grow: true,
			growToLongestValue: true,
			showArrows: false,
			labelAlign: 'right',
			width: 200,
			layout: 'fit',
			renderTo: 'releaseContainer',
			region: 'north',
			listeners: {
				scope: me,
				select: me.onChanged
			}
		});
		me.app.add(me.releaseCombobox);
		me.onChanged();
	};

	/**
	 * initializeProjectedCheckbox
	 * 
	 * Initialize the Show Projected Trend Checkbox
	 */
	this.initializeProjectedCheckbox = function() {
		if (this.ALWAYS_HIDE_PROJECTED) return;

		this.projectedCheckbox = new Rally.ui.CheckboxField({
			fieldLabel: 'Show Projected',
			value: true,
			labelAlign: 'right',
			width: 500,
			hidden: true,
			hideMode: 'visibility',
			listeners: {
				scope: this,
				change: this.onChanged
			}
		});
		this.app.add(this.projectedCheckbox);
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

		var url = (this.LOCAL) ? 'local/QueryResult.json' : this.buildURL(start);

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
			success: this.processQueryResults,
			failure: this.queryFailed
		});
	};

	return {
		run: function( rallyApp ){
			message = Ext.Msg.alert(
				{
                	title: 'Loading...',
                    msg: 'Please wait while the data is loading'
                });
			app = rallyApp;
			context = (LOCAL) ? undefined : app.getContext();
			initializeReleaseCombobox();
			//queryRallyStore();
		},
		
		resize: function(){
			if( chartData && chartOptions && chart ){
				DEBUG && console.log( 'redrawing chart' );
				chart.draw( chartData, chartOptions );
			}
			else{
				DEBUG && console.log( 'resize called - but chart isnt present' );
			}
		}
	};
}();
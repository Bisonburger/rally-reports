var rally = RallyAPI();

var projectId = '34279769';

var iterData = [];

rally.getProject(projectId).then(function(prj) {
    rally.getIterationsForProject(prj).then(function(iterations) {
            iterData = iterations.map(function(iteration) {
                return {
                    x: iteration.TaskActualTotal,
                    y: iteration.TaskEstimateTotal,
                    z: iteration.BusinessValue,
                    name: iteration.Name,
                    country: iteration.Name
                };})
            });
    });

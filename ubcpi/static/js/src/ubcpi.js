/* Javascript for PeerInstructionXBlock. */

var generatePIXBlockId;
if (typeof generatePIXBlockId !== "function") {
    generatePIXBlockId = (function () {
        "use strict";
        var id = 0;
        return function () {
            return "ubcpi_" + (id += 1);
        }
    }());
}

function PeerInstructionXBlock(runtime, element, data) {
    "use strict";
    var notify;

    // The workbench doesn't support notifications.
    notify = $.proxy(runtime.notify, runtime) || function(){};

    $(function ($) {
        var appId = generatePIXBlockId();
        var app = angular.module(appId, ['nvd3ChartDirectives']);
        app.run(function($http) {
            // set up CSRF Token from cookie. This is needed by all post requests
            $http.defaults.headers.post['X-CSRFToken'] = $.cookie('csrftoken');
        });
        app.controller('ReviseController', function ($scope, $http) {
            var self = this;

            $scope.appId = appId;
            $scope.question_text = data.question_text;
            $scope.options = data.options;
            $scope.chartData = [
                {
                    'key': 'Original',
                    'color': '#d62728',
                    'values': []
                },
                {
                    'key': 'Revised',
                    'color': '#1f77b4',
                    'values': []
                }
            ];

            self.STATUS_NEW      = 0;
            self.STATUS_ANSWERED = 1;
            self.STATUS_REVISED  = 2;

            self.answer_original = data.answer_original;
            self.rationale_original = data.rationale_original;
            self.answer_revised = data.answer_revised;
            self.rationale_revised = data.rationale_revised;
            self.answer = self.answer_revised || self.answer_original;
            self.rationale = self.rationale_revised || self.rationale_original;
            self.submitting = false;
			self.other_answers = data.other_answers;
            self.correct_answer = data.correct_answer;

            function getStatus(answer_original, answer_revised) {
                if (typeof answer_original === 'undefined' || answer_original === null) {
                    return self.STATUS_NEW;
                } else if (typeof answer_revised === 'undefined' || answer_revised === null) {
                    return self.STATUS_ANSWERED;
                } else {
                    return self.STATUS_REVISED;
                }
            }

            self.status = function() {
                return getStatus(self.answer_original, self.answer_revised);
            };

            self.disableSubmit = function () {
                var haveAnswer = typeof self.answer !== "undefined" && self.answer !== null;
                var haveRationale = typeof self.rationale !== "undefined" && self.rationale !== null;
                var enable = haveAnswer && haveRationale && !self.submitting;
                return !enable;
            };

            self.clickSubmit = function () {
                notify('save', {state: 'start', message: "Submitting"});
                self.submitting = true;

                var submitUrl = runtime.handlerUrl(element, 'submit_answer');
                var submitData = JSON.stringify({
                    "q": self.answer,
                    "rationale": self.rationale,
                    "status": self.status()
                });
                $http.post(submitUrl, submitData).
                    success(function(data, status, header, config) {
                        self.submitting = false;
                        self.answer_original = data.answer_original;
                        self.rationale_original = data.rationale_original;
                        self.answer_revised = data.answer_revised;
                        self.rationale_revised = data.rationale_revised;
						self.other_answers = data.other_answers;
                        self.correct_answer = data.correct_answer;
                        notify('save', {state: 'end'})
                    }).
                    error(function(data, status, header, config) {
                        notify('error', {
                            'title': 'Error submitting answer!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

            self.getStats = function() {
                var statsUrl = runtime.handlerUrl(element, 'get_stats');
                $http.post(statsUrl, '""').
                    success(function(data, status, header, config) {
                        console.log("Getting stats");
                        console.log(data);
                        self.stats = data;
                        $scope.chartData[0].values = [];
                        $scope.chartData[1].values = [];
                        for (var i = 0; i < $scope.options.length; i++) {
                            var count = 0;
                            if (i in data.original) {
                                count = data.original[i];
                            }
                            $scope.chartData[0]['values'].push([$scope.options[i], count]);

                            count = 0;
                            if (i in data.revised) {
                                count = data.revised[i];
                            }
                            $scope.chartData[1]['values'].push([$scope.options[i], count]);
                        }
                        console.log($scope.chartData);
                    }).
                    error(function(data, status, header, config) {
                        notify('error', {
                            'title': 'Error retrieving statistics!',
                            'message': 'Please refresh the page and try again!'
                        });
                    });
            };

        });
        angular.bootstrap(element, [appId]);
    });
}

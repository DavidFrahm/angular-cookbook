var SomeApi = angular.module('someApi', []);

SomeApi.config(function authCheckHttpInterceptor($httpProvider) {
    $httpProvider.interceptors.push(function($log, $q, $window, ServerUrls, User) {
        return {
            'request': function(request) {
//				log('authCheckHttpInterceptor() > request()');
                // If we're not logged-in to the AngularJS app, redirect to login page
                // Normally would also check for not already on Login page, but this app's login is server-only
//                if (!User.hasApiKey) {
//                    $window.location.href = ServerUrls.login;
//                }
                return request;
            },
            'responseError': function(rejection) {
//				log('authCheckHttpInterceptor() > responseError()');
                // If API rejects auth, redirect to login page
                // Normally would also check for not already on Login page, but this app's login is server-only

                if (rejection.status === 401) {
                    $log.error('Interceptor > status = 4xx; Call reset and go to login');
                    User.reset();
                    $window.location.href = ServerUrls.login();
                }
                return $q.reject(rejection);
            }
        };
    });
});

SomeApi.factory('User', ['$cookies', function ($cookies) {
    var API_KEY_COOKIE = 'some_api';

    var isLoggedIn = function () {
        return hasApiKey();
    };

    var getApiKey = function () {
        return $cookies[API_KEY_COOKIE];
    };

    var hasApiKey = function () {
        return getApiKey() ? true : false;
    };

    var reset = function () {
        if ($cookies[API_KEY_COOKIE]) {
            /*
             * Unable to use AngularJS $cookies because Django sets cookie with path differently than where Angular is when it tries to delete it.
             *     And AngularJS $cookies does not allow you to specify path.
             * The code does not error, but cookie is NOT actually removed.
             *
             * delete $cookies[API_KEY_COOKIE];
             */
            document.cookie = API_KEY_COOKIE + '=; path=/; expires=' + new Date(0).toUTCString();
        }
    }

    return {
        hasApiKey: hasApiKey,
        getApiKey: getApiKey,
        isLoggedIn: isLoggedIn,
        reset: reset
    };
}]);

SomeApi.run(['$rootScope', '$window', '$log', 'User', 'ServerUrls', function ($rootScope, $window, $log, User, ServerUrls) {
    /*
     * $locationChangeStart (lCS):
     *     - Does NOT include our custom properties on routes (var 'next')
     *     - Allows for event.preventDefault()
     *     - Occurs before $routeChangeStart
     */
    $rootScope.$on("$locationChangeStart", function (event, next, current) {
        // Nothing needed here yet
    });

    /*
     * $routeChangeStart (rCS):
     *     - Includes our custom properties on routes (var 'next')
     *     - Does NOT allow event.preventDefault()
     *     - Occurs after $locationChangeStart
     */
    $rootScope.$on('$routeChangeStart', function (event, next, current) {
        $log.debug('$routeChangeStart() via run()');
        $log.debug('$rCS > next.access: ' + angular.toJson(next.access));
        if ((next.access === undefined || (next.access != undefined && !next.access.allowAnonymous)) && !User.isLoggedIn()) {
            $log.debug('$rCS > Redirect to Login...');
            $window.location.href = ServerUrls.login();
        } else {
            $log.debug('$rCS > All clear (Anonymous allowed OR User is logged in)');
        }
    });
}]);

SomeApi.factory('authTokenHttpInterceptor', ['$q', 'User', function ($q, User) {
    return {
        request: function (config) {
            if (User.hasApiKey()) {
                config.headers.Authorization = 'Bearer ' + User.getApiKey();
            }
            return config || $q.when(config);
        }
    };
}]);

SomeApi.config(['$httpProvider', function configAuthToken($httpProvider) {
    $httpProvider.interceptors.push('authTokenHttpInterceptor');
}]);

// TODO: Probably don't need this; Remove it and find out
SomeApi.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.defaults.headers.patch = {
        'Content-Type': 'application/json;charset=utf-8'
    }
}]);

SomeApi.factory('utils', ['$q', '$log', function ($q, $log) {
    var getUriBase = function() {
        // @@ notation is for Grunt string-replace
        var uri = 'http://localhost:8000/api/1.0/';
        if (uri.substring(0,2) === '@@') {
            uri = '/api/1.0/';
        }
        return uri;
    }
    var fixTrailingSlash = function(resourcePath) {
        return resourcePath.replace(/\/+$/, '/?');
    }
    return {
        getRequestUrl: function(resourcePath) {
            return getUriBase() + fixTrailingSlash(resourcePath);
        },
        blobToDataURL: function(blob) {
            var delay = $q.defer();
            var reader = new FileReader();
            reader.onload = function() {
                var dataUrl = reader.result;
                delay.resolve(dataUrl);
            };
            reader.readAsDataURL(blob);
            return delay.promise;
        },
        assignErrors: function(errors, form, scopeErrors) {
            for (var fieldName in errors) {
                var userDisplayErrorMessage = '';
                var typicalErrorsArray = errors[fieldName];
                if (angular.isArray(typicalErrorsArray)) {
                    userDisplayErrorMessage = typicalErrorsArray.join('. ');
                } else {
                    var nonTypicalErrorsArrayFromMultiValueString = typicalErrorsArray[Object.keys(typicalErrorsArray)[0]];
                    userDisplayErrorMessage = nonTypicalErrorsArrayFromMultiValueString.join('. ');
                }
                this.assignError(userDisplayErrorMessage, form, fieldName, scopeErrors);
            }
        },
        assignError: function(error, form, fieldName, scopeErrors) {
            form[fieldName].$setValidity('validation', false);
            scopeErrors[fieldName] = error;
        }
    };
}]);

SomeApi.factory('ServerUrls', function ($window) {
    function getCurrentPathname() {
        var pathname = $window.location.pathname;
        var hasUsefulPath = (pathname && pathname !== '/');
        if (hasUsefulPath) {
            return pathname;
        }
    }

    function getCurrentHashFragment() {
        var hashFragment = $window.location.hash;
        var hasUsefulHashFragment = (hashFragment && hashFragment !== '#/');
        if (hasUsefulHashFragment) {
            var djangoRedirectSafeHash = '%23';
            return djangoRedirectSafeHash + hashFragment.split('#')[1];
        }
        return '';
    }

    function getLoginUrl(addRedirect) {
        if (addRedirect !== false) {
            addRedirect = true;
        }
        var loginUrl = '/login/';
        var hasUsefulRedirect = (getCurrentPathname() || getCurrentHashFragment());
        if (addRedirect && hasUsefulRedirect) {
            loginUrl += '?next=' + getCurrentPathname() + getCurrentHashFragment();
        }
        return loginUrl;
    }

    return {
        login: getLoginUrl
    };
});

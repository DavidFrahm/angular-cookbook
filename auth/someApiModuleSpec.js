'use strict';

describe('someApiModule', function () {

    describe('config', function () {
        var httpProvider;

        beforeEach(angular.mock.module('ngCookies'));

        it('should have added authTokenHttpInterceptor as http interceptor', function () {
            module('someApi', function ($httpProvider) {
                httpProvider = $httpProvider;
            });

            inject();

            expect(httpProvider.interceptors).toContain('authTokenHttpInterceptor');
        });
    });

    describe('module itself', function () {
        it("should be registered", function () {
            var thisModule = angular.module('someApi');
            expect(thisModule).toBeDefined();
        });
    });

    describe('utils', function () {
        var utils;

        beforeEach(function () {
            module('someApi');
            angular.mock.module('ngCookies');

            inject(function (_utils_) {
                utils = _utils_;
            });
        });

        it('should append question mark to URL with trailing slash', function () {
            var finalUrl = utils.getRequestUrl('/something/');

            expect(finalUrl).toEndWith('/something/?');
        });

        it('should not append question mark to URL without trailing slash', function () {
            var finalUrl = utils.getRequestUrl('/something');

            expect(finalUrl).toEndWith('/something');
        });
    });

    describe('authTokenHttpInterceptor', function () {
        var authTokenHttpInterceptor;

        beforeEach(function () {
            angular.mock.module('someApi', 'ngCookies');

            inject(function (_authTokenHttpInterceptor_) {
                authTokenHttpInterceptor = _authTokenHttpInterceptor_;
            });
        });

        it('should have a request function', function () {
            expect(angular.isFunction(authTokenHttpInterceptor.request)).toBe(true);
        });

        it('should set Authorization header when have api key', inject(function ($cookies) {
            $cookies.some_api = 'any-key';

            var httpConfig = {"headers": {}};
            var config = authTokenHttpInterceptor.request(httpConfig);

            expect(config.headers.Authorization).toEqual('Bearer any-key');
        }));

        it('should set not Authorization header when do not have api key', function () {
            var httpConfig = {"headers": {}};
            var config = authTokenHttpInterceptor.request(httpConfig);

            expect(config.headers.Authorization).not.toBeDefined();
        });
    });

    describe('ServerUrls', function () {
        var serverUrls;
        var windowStub;

        beforeEach(function () {
            angular.mock.module('someApi', 'ngCookies');

            // Using $provide here because window stub must be setup BEFORE ServerUrls is instantiated.
            module(function($provide) {
                windowStub = {
                    location:{
                        href: "http://www.website.com"
                    }
                };
                $provide.value('$window', windowStub);
            });

            inject(function (ServerUrls) {
                serverUrls = ServerUrls;
            });
        });

        it('should route to login without next parameter in query string when current URL has no pathname or hash fragment', function () {
            var loginUrl = serverUrls.login();

            expect(loginUrl).toEqual('/login/');
        });

        it('should route to login without hash fragment in next parameter in query string when current URL has pathname without hash fragment', function () {
            windowStub.location.pathname = '/some-path/index.html';

            var loginUrl = serverUrls.login();

            expect(loginUrl).toEqual('/login/?next=/some-path/index.html');
        });

        it('should route to login with hash fragment in next parameter in query string when addRedirect param is true', function () {
            windowStub.location.pathname = '/some-path/index.html';

            var loginUrl = serverUrls.login(true);

            expect(loginUrl).toEqual('/login/?next=/some-path/index.html');
        });

        it('should route to login without hash fragment in next parameter in query string when addRedirect param is false', function () {
            windowStub.location.pathname = '/some-path/index.html';

            var loginUrl = serverUrls.login(false);

            expect(loginUrl).toEqual('/login/');
        });

        it('should escape hash fragment when route to login with hash fragment', function () {
            windowStub.location.pathname = '/some-path/index.html';
            windowStub.location.hash = '#/some-route';

            var loginUrl = serverUrls.login();

            expect(loginUrl).toEqual('/login/?next=/some-path/index.html%23/some-route');
        });

        it("should route to login without hash fragment in next parameter in query string when current URL has pathname with hash fragment to angular root '#/'", function () {
            windowStub.location.pathname = '/';
            windowStub.location.hash = '#/';

            var loginUrl = serverUrls.login();

            expect(loginUrl).toEqual('/login/');
        });

    });

});

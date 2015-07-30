/*****************************************************************************
 * Open MCT Web, Copyright (c) 2014-2015, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT Web is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT Web includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
/*global define*/

/**
 * Module defining SearchAggregator. Created by shale on 07/16/2015.
 */
define(
    [],
    function () {
        "use strict";

        var DEFUALT_TIMEOUT =  1000,
            DEFAULT_MAX_RESULTS = 100;
        
        /**
         * Allows multiple services which provide search functionality 
         *   to be treated as one.
         *
         * @constructor
         * @param $q Angular's $q, for promise consolidation
         * @param {SearchProvider[]} providers the search providers to be
         *        aggregated
         */
        function SearchAggregator($q, providers) {
            var loading;
            
            // Remove duplicate objects that have the same ID. Modifies the passed 
            //   array, and returns the number that were removed. 
            function filterDuplicates(results, total) {
                var ids = [],
                    numRemoved = 0;
                
                for (var i = 0; i < results.length; i += 1) {
                    if (ids.indexOf(results[i].id) !== -1) {
                        // If this result's ID is already there, remove the object
                        results.splice(i, 1);
                        numRemoved += 1;
                        
                        // Reduce loop index because we shortened the array 
                        i -= 1;
                    } else {
                        // Otherwise add the ID to the list of the ones we have seen 
                        ids.push(results[i].id);
                    }
                }
                
                return numRemoved;
            }
            
            // Order the objects from highest to lowest score in the array.
            // Modifies the passed array, as well as returns the modified array. 
            function orderByScore(results) {
                results.sort(function (a, b) {
                    if (a.score > b.score) {
                        return -1;
                    } else if (b.score > a.score) {
                        return 1;
                    } else {
                        return 0;
                    }
                });
                return results;
            }
            
            // For documentation, see sendQuery below.
            function queryAll(inputText) {
                var i,
                    timestamp = Date.now(),
                    resultPromises = [];
                
                // We are loading
                loading = true;
                
                // Send the query to all the providers
                for (i = 0; i < providers.length; i += 1) {
                    resultPromises.push(
                        providers[i].query(inputText, timestamp, DEFAULT_MAX_RESULTS, DEFUALT_TIMEOUT)
                    );
                }
                
                // Get promises for results arrays
                return $q.all(resultPromises).then(function (resultObjects) {
                    var results = [],
                        totalSum = 0,
                        i;
                    
                    // Merge results 
                    for (i = 0; i < resultObjects.length; i += 1) {
                        results = results.concat(resultObjects[i].hits);
                        totalSum += resultObjects[i].total;
                    }
                    // Order by score first, so that when removing repeats we keep the higher scored ones
                    orderByScore(results);
                    totalSum = filterDuplicates(results, totalSum);
                    
                    // We are done loading 
                    loading = false;
                    
                    return {
                        hits: results,
                        total: totalSum
                    };
                });
            }
            
            return {
                /** 
                 * Sends a query to each of the providers. Returns a promise for
                 *   a result object that has the format
                 *   {hits: domainObject[], total: number}
                 *
                 * @param inputText The text input that is the query.
                 */
                query: queryAll,
                
                /**
                 * Checks to see if we are still waiting for the results to be 
                 *   fully updated. 
                 */
                isLoading: function () {
                    return loading;
                }
            };
        }

        return SearchAggregator;
    }
);
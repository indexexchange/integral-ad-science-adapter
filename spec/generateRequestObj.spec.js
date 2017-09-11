/**
 * @author:    Index Exchange
 * @license:   UNLICENSED
 *
 * @copyright: Copyright (C) 2017 by Index Exchange. All rights reserved.
 *
 * The information contained within this document is confidential, copyrighted
 *  and or a trade secret. No part of this document may be reproduced or
 * distributed in any form or by any means, in whole or in part, without the
 * prior written permission of Index Exchange.
 */
// jshint ignore: start

'use strict';

/* =====================================
 * Utilities
 * ---------------------------------- */

/**
 * Returns an array of parcels based on all of the xSlot/htSlot combinations defined
 * in the partnerConfig (simulates a session in which all of them were requested).
 *
 * @param {object} profile
 * @param {object} partnerConfig
 * @returns []
 */
function generateReturnParcels(profile, partnerConfig) {
    var returnParcels = [];

    for (var htSlotName in partnerConfig.mapping) {
        (function(htSlotName) {
            if (partnerConfig.mapping.hasOwnProperty(htSlotName)) {
                var xSlotsArray = partnerConfig.mapping[htSlotName];
                for (var i = 0; i < xSlotsArray.length; i++) {
                    var xSlotName = xSlotsArray[i];
                    returnParcels.push({
                        partnerId: profile.partnerId,
                        htSlot: {
                            getId: function() {
                                return htSlotName;
                            }

                        },
                        ref: "",
                        xSlotRef: partnerConfig.xSlots[xSlotName],
                        requestId: '_' + Date.now()
                    });
                }
            }
        })(htSlotName);
    }

    return returnParcels;
}

/* =====================================
 * Testing
 * ---------------------------------- */

describe('generateRequestObj', function () {

    /* Setup and Library Stub
     * ------------------------------------------------------------- */
    var inspector = require('schema-inspector');
    var proxyquire = require('proxyquire').noCallThru();
    var libraryStubData = require('./support/libraryStubData.js');
    var partnerModule = proxyquire('../integral-ad-science-nob.js', libraryStubData);
    var partnerConfig = require('./support/mockPartnerConfig.json');
    var expect = require('chai').expect;
    var Browser = libraryStubData['browser.js'];
    var Utilities = libraryStubData['utilities.js'];
    /* -------------------------------------------------------------------- */

    /* Instatiate your partner module */
    var partnerModule = partnerModule(partnerConfig);
    var partnerProfile = partnerModule.profile;

    /* Generate dummy return parcels based on MRA partner profile */
    var returnParcels;
    var requestObject;

    /* Generate a request object using generated mock return parcels. */
    returnParcels = generateReturnParcels(partnerProfile, partnerConfig);

    /* -------- IF SRA, generate a single request for all the parcels -------- */
    if (partnerProfile.architecture) {
        requestObject = partnerModule.generateRequestObj(returnParcels);

        /* Simple type checking, should always pass */
        it('SRA - should return a correctly formatted object', function () {
            var result = inspector.validate({
                type: 'object',
                strict: true,
                properties: {
                    url: {
                        type: 'string',
                        minLength: 1
                    },
                    data: {
                        type: 'object'
                    },
                    callbackId: {
                        type: 'string',
                        minLength: 1
                    }
                }
            }, requestObject);

            expect(result.valid).to.be.true;
        });

        /* Test that the generateRequestObj function creates the correct object by building a URL
            * from the results. This is the bid request url that wrapper will send out to get demand
            * for your module.
            *
            * The url should contain all the necessary parameters for all of the request parcels
            * passed into the function.
            */

        /* ---------- ADD MORE TEST CASES TO TEST AGAINST REAL VALUES ------------*/
        describe('returns a request object that', function() {
            it('exists', function() {
                expect(requestObject).to.exist;
            });
            describe('has a property `url` that', function() {
                it('exists', function() {
                    expect(requestObject.url).to.exist;
                });
                it('contains IAS endpoint', function() {
                    expect(/pixel.adsafeprotected.com\/services\/pub/.test(requestObject.url.split('?')[0])).to.be.true;
                });
                it('contains the anId', function() {
                    const anId = partnerConfig.pubId;
                    expect(requestObject.url).to.contain('anId=' + anId);
                });
                it('contains slot information', function() {
                    function stringifySlotSize(sizes) {
                        var stringifiedSizes;
                        if (Utilities.isArray(sizes)) {
                            stringifiedSizes = sizes.reduce(function(result, size) {
                                result.push(size.join('.'));
                                return result;
                            }, []);
                            stringifiedSizes = '[' + stringifiedSizes.join(',') + ']';
                        }
                        return stringifiedSizes;
                    }
                    Object.keys(partnerConfig.xSlots).forEach(function(xSlotId) {
                        const slotPath = partnerConfig.xSlots[xSlotId].adUnitPath;
                        const slotSize = partnerConfig.xSlots[xSlotId].sizes;
                        expect(requestObject.url).to.contain('slot={id:htSlot' + xSlotId + ',ss:' + stringifySlotSize(slotSize) + ',p:' + slotPath + '}')
                    });
                });
                it('contains window resolution', function() {
                    const wr = [Browser.getViewportWidth(), Browser.getViewportHeight()].join('.');
                    expect(requestObject.url).to.contain('wr=' + wr);
                });
                it('contains screen resolution', function() {
                    const sr = [Browser.getScreenWidth(), Browser.getScreenHeight()].join('.');
                    expect(requestObject.url).to.contain('sr=' + sr);
                });
            });
            describe('has a property `data` that', function() {
                it('exists', function() {
                    expect(requestObject.data).to.exist;
                });
            });
            describe('has a property `callbackId` that', function() {
                it('exists', function() {
                    expect(requestObject.callbackId).to.exist;
                });
            });
        });

        console.log(requestObject);
        /* -----------------------------------------------------------------------*/

    /* ---------- IF MRA, generate a single request for all the parcels ---------- */
    }
});
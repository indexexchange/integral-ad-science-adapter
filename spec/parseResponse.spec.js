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

describe('parseResponse', function () {

    /* Setup and Library Stub
     * ------------------------------------------------------------- */
    var inspector = require('schema-inspector');
    var proxyquire = require('proxyquire').noCallThru();
    var libraryStubData = require('./support/libraryStubData.js');
    var partnerModule = proxyquire('../integral-ad-science-nob.js', libraryStubData);
    var partnerConfig = require('./support/mockPartnerConfig.json');
    var expect = require('chai').expect;
    /* -------------------------------------------------------------------- */

    /* Instatiate your partner module */
    var partnerModule = partnerModule(partnerConfig);
    var partnerProfile = partnerModule.profile;

    /* Generate dummy return parcels based on MRA partner profile */
    var returnParcels;

    describe('should correctly parse targeting keywords:', function () {
        var returnParcels1 = generateReturnParcels(partnerModule.profile, partnerConfig);

        /* ---------- MODIFY THIS TO MATCH YOUR AD RESPONSE FORMAT ---------------*/
        /* This is your mock response data.
         * Should contain a bid for every parcel in the returnParcels array.
         *
         *  For example:
         * [{
         *     "placementId": "54321",
         *     "sizes": [
         *         [300, 250]
         *     ],
         *     "pass": false,
         *     "price": 2,
         *     "adm": "<img src=''/>"
         * },
         * {
         *     "placementId": "12345",
         *     "sizes": [
         *         [300, 600]
         *     ],
         *     "pass": false,
         *     "price": 3,
         *     "adm": "<img src=''/>"
         * }]
         *
         *
         * The response should contain the response for all of the parcels in the array.
         * For SRA, this could be mulitple items, for MRA it will always be a single item.
         */

        var adResponseMock1 = {
            "brandSafety": {
                "adt": "veryLow",
                "dlm": "low",
                "drg": "veryLow",
                "alc": "high",
                "hat": "veryLow",
                "vio": "veryLow",
                "off": "veryLow"
            },
            "fr": false,
            "slots": {
                "htSlot1": {
                    "vw": ["40","50","60","70"],
                    "id": "5848565c-4dd4-11e6-9f0b-0025904ea2be"
                },
                "htSlot2": {
                    "vw": ["40","50","60"],
                    "id": "1248565c-4dd4-11e6-9f0b-0025904ea2bf"
                },
                "htSlot3": {
                    "vw": ["40","50"],
                    "id": "6648565c-4dd4-11e6-9f0b-0025904ea2bg"
                }
            }
        };
        /* ------------------------------------------------------------------------*/

        /* IF SRA, parse all parcels at once */
        if (partnerProfile.architecture) partnerModule.parseResponse(1, adResponseMock1, returnParcels1);

        /* Simple type checking on the returned objects, should always pass */
        it('each parcel should have the required fields set', function () {
            for (var i = 0; i < returnParcels1.length; i++) {

                /* IF MRA, parse one parcel at a time */
                if (!partnerProfile.architecture) partnerModule.parseResponse(1, adResponseMock1, [returnParcels1[i]]);

                var result = inspector.validate({
                    type: 'object',
                    properties: {
                        targetingType: {
                            type: 'string',
                            eq: 'slot'
                        },
                        targeting: {
                            type: 'object',
                            properties: {
                                [partnerModule.profile.targetingKeys.id]: {
                                    type: 'string',
                                    exactLength: 36
                                },
                                [partnerModule.profile.targetingKeys.adt]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.alc]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.dlm]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.hat]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.off]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.vio]: {
                                    type: 'string'
                                },
                                [partnerModule.profile.targetingKeys.fr]: {
                                    type: 'boolean'
                                },
                                [partnerModule.profile.targetingKeys.vw]: {
                                    type: 'array',
                                    minLength: 1
                                }
                            }
                        }
                    }
                }, returnParcels1[i]);

                expect(result.valid, result.format()).to.be.true;
            }
        });

        function responseValidator(response, parcel) {
            var TARGETING_KEYWORD_PREFIX = 'ix_ias_';
            return Object.keys(response).every(function(key) {
                return parcel.targeting[TARGETING_KEYWORD_PREFIX + key] == response[key];
            })
        }

        describe('each parcel should have different kinds of targeting keyword values set', function() {
            it('each parcel should have the correct brand safety keyword values set', function () {
                var currentParcel;
                for (var i = 0; i < returnParcels1.length; i++) {
                    currentParcel = returnParcels1[i];
                    expect(responseValidator(adResponseMock1.brandSafety, currentParcel)).to.be.true;

                }
            });
            it('each parcel should have the correct slot level keyword values set', function () {
                var currentParcel, currentSlotId, currentSlotTargeting;
                for (var i = 0; i < returnParcels1.length; i++) {
                    currentParcel = returnParcels1[i];
                    currentSlotId = currentParcel.htSlot.getId();
                    currentSlotTargeting = adResponseMock1.slots[currentSlotId];
                    expect(responseValidator(currentSlotTargeting, currentParcel)).to.be.true;
                }
            });
            it('each parcel should have the correct fraud keyword values set', function () {
                var currentParcel;
                for (var i = 0; i < returnParcels1.length; i++) {
                    currentParcel = returnParcels1[i];
                    expect(adResponseMock1['fr'] === currentParcel.targeting['ix_ias_fr']).to.be.true;
                }
            });
        });
        /* -----------------------------------------------------------------------*/
    });
});
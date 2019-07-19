/*
 * Copyright (c) 2016-present,
 * Jaguar0625, gimre, BloodyRookie, Tech Bureau, Corp. All rights reserved.
 *
 * This file is part of Catapult.
 *
 * Catapult is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Catapult is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Catapult.  If not, see <http://www.gnu.org/licenses/>.
 */

const lock = require('../../../src/plugins/lock/lock');
const LockDb = require('../../../src/plugins/lock/LockDb');
const { test } = require('../../routes/utils/routeTestUtils');
const pluginTest = require('../utils/pluginTestUtils');

describe('lock plugin', () => {
	pluginTest.assertThat.pluginCreatesDb(lock, LockDb);
	pluginTest.assertThat.pluginDoesNotRegisterAdditionalTransactionStates(lock);
	pluginTest.assertThat.pluginDoesNotRegisterAdditionalMessageChannels(lock);

	describe('register routes', () => {
		it('registers lock GET routes', () => {
			// Arrange:
			const routes = [];
			const server = test.setup.createCapturingMockServer('get', routes);

			// Act:
			lock.registerRoutes(server, {});

			// Assert:
			test.assert.assertRoutes(routes, [
				'/account/:accountId/lock/hash',
				'/account/:accountId/lock/secret',
				'/lock/hash/:hash',
				'/lock/secret/:secret'
			]);
		});
	});
});

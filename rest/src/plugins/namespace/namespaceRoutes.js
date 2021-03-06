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

const namespaceUtils = require('./namespaceUtils');
const dbUtils = require('../../db/dbUtils');
const routeUtils = require('../../routes/routeUtils');
const catapult = require('catapult-sdk');
const MongoDb = require('mongodb');

const { Binary } = MongoDb;
const { convertToLong } = dbUtils;
const { uint64 } = catapult.utils;

module.exports = {
	register: (server, db) => {
		const namespaceSender = routeUtils.createSender('namespaceDescriptor');

		server.get('/namespace/:namespaceId', (req, res, next) => {
			const namespaceId = routeUtils.parseArgument(req.params, 'namespaceId', uint64.fromHex);
			return db.namespaceById(namespaceId)
				.then(namespaceSender.sendOne(req.params.namespaceId, res, next));
		});

		server.get('/account/:address/namespaces', (req, res, next) => {
			const accountAddress = routeUtils.parseArgument(req.params, 'address', 'address');
			const pagingOptions = routeUtils.parsePagingArguments(req.params);

			return db.namespacesByOwners([accountAddress], pagingOptions.id, pagingOptions.pageSize)
				.then(namespaces => routeUtils.createSender('namespaces').sendOne('accountId', res, next)({ namespaces }));
		});

		server.post('/account/namespaces', (req, res, next) => {
			const accountAddresses = routeUtils.parseArgumentAsArray(req.params, 'addresses', 'address');
			const pagingOptions = routeUtils.parsePagingArguments(req.params);
			return db.namespacesByOwners(accountAddresses, pagingOptions.id, pagingOptions.pageSize)
				.then(namespaces => routeUtils.createSender('namespaces').sendOne('addresses', res, next)({ namespaces }));
		});

		const collectNames = (namespaceNameTuples, namespaceIds) => {
			const type = catapult.model.EntityType.registerNamespace;
			return db.catapultDb.findNamesByIds(namespaceIds, type, { id: 'id', name: 'name', parentId: 'parentId' })
				.then(nameTuples => {
					nameTuples.forEach(nameTuple => {
						// db returns null instead of undefined when parentId is not present
						if (null === nameTuple.parentId)
							delete nameTuple.parentId;

						namespaceNameTuples.push(nameTuple);
					});

					// process all parent namespaces next
					return nameTuples
						.filter(nameTuple => undefined !== nameTuple.parentId)
						.map(nameTuple => nameTuple.parentId);
				});
		};

		server.post('/namespace/names', (req, res, next) => {
			const namespaceIds = routeUtils.parseArgumentAsArray(req.params, 'namespaceIds', uint64.fromHex);
			const nameTuplesFuture = new Promise(resolve => {
				const namespaceNameTuples = [];
				const chain = nextIds => {
					if (0 === nextIds.length)
						resolve(namespaceNameTuples);
					else
						collectNames(namespaceNameTuples, nextIds).then(chain);
				};

				collectNames(namespaceNameTuples, namespaceIds).then(chain);
			});

			return nameTuplesFuture.then(routeUtils.createSender('namespaceNameTuple').sendArray('namespaceIds', res, next));
		});

		server.post('/mosaic/names', namespaceUtils.aliasNamesRoutesProcessor(
			db,
			catapult.model.namespace.aliasType.mosaic,
			req => routeUtils.parseArgumentAsArray(req.params, 'mosaicIds', uint64.fromHex).map(convertToLong),
			(namespace, id) => namespace.namespace.alias.mosaicId.equals(id),
			'mosaicId',
			'mosaicNames'
		));

		server.post('/account/names', namespaceUtils.aliasNamesRoutesProcessor(
			db,
			catapult.model.namespace.aliasType.address,
			req => routeUtils.parseArgumentAsArray(req.params, 'addresses', 'address'),
			(namespace, id) => Buffer.from(namespace.namespace.alias.address.value())
				.equals(Buffer.from(new Binary(Buffer.from(id)).value())),
			'address',
			'accountNames'
		));
	}
};

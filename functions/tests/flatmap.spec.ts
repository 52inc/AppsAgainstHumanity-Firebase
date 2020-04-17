// tslint:disable:no-implicit-dependencies
import { flatMap } from "../src/util/flatmap";
import { expect } from 'chai';
import 'mocha';

describe('flatmap', () => {
    it('should flatten array of arrays', () => {
        const array = [
            {test: ["1"]},
            {test: ["2"]},
            {test: ["3"]},
        ];
        const flatArray = flatMap(array, (e) => e.test);
        expect(flatArray).lengthOf(3);
        expect(flatArray).to.eql(['1','2','3']);
    });

    it('should flatten empty arrays', () => {
        const array = [
            {test: ["1"]},
            {test: ["2"]},
            {test: []},
            {test: ["4"]},
        ];
        const flatArray = flatMap(array, (e) => e.test);
        expect(flatArray).lengthOf(3);
        expect(flatArray).to.eql(['1','2','4']);
    })
});
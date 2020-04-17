import {draw} from '../src/util/deal';
import { expect } from 'chai';
import 'mocha';

describe('Deal', () => {
    it('should should remove elements from array', () => {
        const items = [1,2,3,4,5,6,7,8,9,10];
        const item = draw(items);
        expect(items).to.not.include(item);
        expect(items).to.not.have.lengthOf(10);
        expect(items).to.have.lengthOf(9);
    });
});
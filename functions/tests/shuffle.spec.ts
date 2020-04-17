import { shuffle } from "../src/util/shuffle";
import { expect } from 'chai';
import 'mocha';

describe('shuffle', () => {
    it('should shuffle the original array', () => {
        const array = [
            "0","1","2","3"
        ];
        const array2 = [...array];
        expect(array).to.eql(array2);
        shuffle(array);
        expect(array).not.eql(array2);
    });
});
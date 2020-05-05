// tslint:disable:no-implicit-dependencies
import {all, any, none, sortByIndexedMap} from "../src/util/array";
import { expect } from 'chai';
import 'mocha';

describe('array', () => {
    describe('matching', () => {

        it('should find all elements', () => {
            const array = [
                {test: "bacon"},
                {test: "bacon"},
                {test: "bacon"},
            ];

            const result = all(array, value => value.test === "bacon")

            expect(result).to.be.true
        });

        it('should NOT find all elements', () => {
            const array = [
                {test: "bacon"},
                {test: "bacon"},
                {test: "sausage"},
            ];

            const result = all(array, value => value.test === "bacon")

            expect(result).to.be.false
        });

        it('should find no elements', () => {
            const array = [
                {test: "bacon"},
                {test: "bacon"},
                {test: "bacon"},
            ];

            const result = none(array, value => value.test === "pancakes")

            expect(result).to.be.true
        });

        it('should NOT find no elements', () => {
            const array = [
                {test: "bacon"},
                {test: "bacon"},
                {test: "sausage"},
            ];

            const result = none(array, value => value.test === "sausage")

            expect(result).to.be.false
        });

        it('should find any elements', () => {
            const array = [
                {test: "bacon"},
                {test: "pancakes"},
                {test: "bacon"},
            ];

            const result = any(array, value => value.test === "pancakes")

            expect(result).to.be.true
        });

        it('should NOT find any elements', () => {
            const array = [
                {test: "bacon"},
                {test: "bacon"},
                {test: "sausage"},
            ];

            const result = any(array, value => value.test === "pancakes")

            expect(result).to.be.false
        });


    })

    it('should sort by indexed map', () => {
        const array = [
            {test: "bacon"},
            {test: "sausage"},
            {test: "pancakes"},
        ];
        const indexedMap: {[key: string]: string} = {
            "0": "pancakes",
            "1": "bacon",
            "2": "sausage"
        }

        const sortedArray = sortByIndexedMap(array, indexedMap, value => value.test)

        expect(sortedArray).to.eql([
            {test: "pancakes"},
            {test: "bacon"},
            {test: "sausage"},
        ]);
    });
})
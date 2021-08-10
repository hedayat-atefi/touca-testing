// Copyright 2021 Touca, Inc. Subject to Apache-2.0 License.

import { Case } from '../src/case';
import { ToucaType, TypeHandler } from '../src/types';

describe('basic operations', () => {
  let testcase: Case;
  const type_handler = new TypeHandler();
  const transform = (value: unknown): ToucaType => {
    return type_handler.transform(value);
  };

  beforeEach(() => {
    testcase = new Case({ name: 'some-case' });
    testcase.add_array_element('some-array', transform('some-array-element'));
    testcase.add_result('some-result', transform('some-result-value'));
    testcase.add_hit_count('some-hit-count');
    testcase.add_assertion('some-assertion', transform('some-assertion-value'));
    testcase.add_metric('some-metric', 10);
  });

  test('check slugs are set to unknown when missing', () => {
    expect(testcase.json().metadata.teamslug).toEqual('unknown');
    expect(testcase.json().metadata.testsuite).toEqual('unknown');
    expect(testcase.json().metadata.version).toEqual('unknown');
  });

  test('fail on attempt to add element to hit count', () => {
    expect(() =>
      testcase.add_array_element('some-hit-count', transform('bang'))
    ).toThrowError('specified key has a different type');
  });

  test('fail on attempt to increment hit count of array', () => {
    expect(() => testcase.add_hit_count('some-array')).toThrowError(
      'specified key has a different type'
    );
  });

  test('tic without toc', () => {
    testcase.start_timer('some-tic');
    expect(
      testcase.json().metrics.findIndex((v) => v.key === 'some-tic')
    ).toEqual(-1);
  });

  test('toc without tic', () => {
    testcase.stop_timer('some-toc');
    expect(
      testcase.json().metrics.findIndex((v) => v.key === 'some-toc')
    ).toEqual(-1);
  });
});

# Core API

[Previously](/sdk/cpp/main-api), we covered the high-level API of our C++ SDK
and learned how to test a `find_student` software using the Touca test
framework:

```cpp
#include "students.hpp"
#include "students_types.hpp"
#include "touca/touca.hpp"

int main(int argc, char* argv[]) {
  touca::workflow("find_student", [](const std::string& username) {
    const auto& student = find_student(username);
    // insert code here to describe the behavior
    // and performance of the workflow under test
  });
  return touca::run(argc, argv);
}
```

Functions `touca::workflow` and `touca::run` are the entry-points to the Touca
test framework. In addition to running our workflow under test with different
test cases, the test framework provides facilities that include reporting
progress, handling errors, parsing command line arguments, and many more. We
intentionally designed this API to abstract away these common features to let
developers focus on their workflow under test.

Touca SDK for C++ provides a separate lower-level Client API that offers more
flexibility and control over how tests are executed and how their results are
handled. This API is most useful when integrating Touca with other existing test
frameworks.

```cpp
#include "touca/touca.hpp"
#include "students_test.hpp"

int main() {
  touca::configure({
    { "api-key", "<TOUCA_API_KEY>" },
    { "api-url", "<TOUCA_API_URL>" },
    { "version", "<TOUCA_TEST_VERSION>" }
  });
  for (const username of touca::get_testcases()) {
    touca::declare_testcase(username);

    const auto& student = find_student(username);
    // insert code here to describe the behavior
    // and performance of the workflow under test

    touca::post();
    touca::save_binary("touca_" + username + ".bin");
    touca::save_json("touca_" + username + ".json");
    touca::forget_testcase(username);
  }
  touca::seal();
}
```

The above code uses the low-level Touca Client API to perform the same
operations as the Touca test framework, without handling errors, reporting
progress, and handling command line arguments. In this section, we will review
the functions used in this code and explain what they do.

## Configuring the Client

Touca Client requires a one-time call of function `configure`. This
configuration effectively activates all other Touca functions for capturing data
and submission of results. Therefore, this function must be called from our test
tool, and not from our code under test. This design enables us to leave the
calls to Touca data capturing functions in our production code without having to
worry about their performance impact.

The `configure` function can take various configuration parameters including the
Touca API Key and API URL. You can also specify an external JSON configuration
file via the `file` option. Check out C++ SDK reference API documentation for
the full list of acceptable configuration parameters and their impact.

```cpp
touca::configure({
  { "api-key": "<TOUCA_API_KEY>" },
  { "api-url": "<TOUCA_API_URL>" },
  { "revision": "<TOUCA_TEST_VERSION>" },
});
```

> Touca API Key should be treated as a secret. We advise against hard-coding
> this parameter.

The three common parameters, API Key, API URL, and version of the code under
test can also be set as environment variables `TOUCA_API_KEY`, `TOUCA_API_URL`,
and `TOUCA_TEST_VERSION`. Environment variables always override the parameters
passed to the `configure` function.

All of the configuration parameters passed to `configure` are optional. When
`api_key` and `api_url` are missing, the client is configured in the offline
mode. It can still capture data and store them to files but it will not submit
them to the Touca server.

You can always force the client to run in offline mode by passing the `offline`
parameter to the `configure` function.

## Preparing Test Cases

```cpp
for (const username of touca::get_testcases()) {
  // insert the code to run for each test case
}
```

The test framework expects test cases to be specified via the Touca server UI or
via command line arguments. With the Client API, you can obtain the list of test
cases from any source and pass them, one by one, to your code under test using a
simple for loop.

You can still use the function `get_testcases` to obtain the list of test cases
from the Touca server, as our high-level API does. This function should be
called when the client is configured to run in offline mode.

## Declaring Test Cases

Once the client is configured, you can call `declare_testcase` once for each
test case to indicate that all subsequent captured data and performance
benchmarks belong to the specified test case, until a different test case is
declared. We can change this behavior for multi-threaded software workflows.

```cpp
for (const username of touca::get_testcases()) {
  touca::declare_testcase(username);
  // now we can start calling our code under test
  // and describing its behavior and performance
}
```

With Touca, we consider test cases as a set of unique names that identify
different inputs to our code under test. These inputs can be anything as long as
they are expected to produce the same behavior every time our code is executed.

Similar to `touca::configure`, we should only call `touca::declare_testcase`
from our test tool, and not from our code under test.

## Capturing Test Results

In the [previous document](./main-api.md), we reviewed the main Touca functions
for describing behavior and performance of our code under test, by capturing
values of important variables and runtime of interesting functions. In this
section, we dive a little deeper to explain how Touca tracks values of variables
and performance benchmarks.

### Preserving Data Types

Touca data capturing functions such as `touca::check`, preserve the types of all
captured data so that the Touca server can compare them in their original type.

```cpp
touca::check("username", student.username);
touca::check("fullname", student.fullname);
touca::check("gpa", student.gpa);
```

In the example above, `touca::check` stores value of properties `username` and
`fullname` as `std::string` while property `gpa` is stored as `float`. The
server visualizes possible differences in these values based on their types.

### Customizing Data Serialization

Touca C++ SDK has built-in support for many commonly-used types of the standard
library and can be extended to support custom data types.

Consider the following definition for a user-defined type `Date`.

```cpp
struct Date {
  unsigned short year;
  unsigned short month;
  unsigned short day;
};
```

Using the natively supported types, we can add a value of type `Date` as three
separate test results that each cover individual member variables. But this
practice is cumbersome and impractical for real-world complex data types. To
solve this, we can extend Touca type system to support type `Date` using partial
template specialization.

```cpp
#include "touca/touca.hpp"

template <>
struct touca::serializer<Date> {
  data_point serialize(const Date& value) {
    return object("Date")
        .add("year", value.year)
        .add("month", value.month)
        .add("day", value.day);
  }
};
```

Once the client library learns how to handle a custom type, it automatically
supports handling it as sub-component of other types. As an example, with the
above-mentioned partial template specialization for type `Date`, we can start
adding test results of type `std::vector<Date>` or `std::map<string, Date>`.

```cpp
touca::check("birth_date", student.dob);
```

Consult with the Reference API documentation for more information and examples
for supporting custom types.

## Submitting Test Results

Once we execute our code under test for each test case and describe its behavior
and performance, we can submit them to the Touca server.

```cpp
touca::post();
```

The server stores the captured data, compares them against the submitted data
for pervious versions of our code, visualizes any differences, and reports them
in real-time.

It is possible to call `touca::post` multiple times during the runtime of our
test tool. Test cases already submitted to the Touca server whose results have
not changed, will not be resubmitted. It is also possible to add new results for
an already submitted test case. Any subsequent call to `touca::post` will
resubmit the modified test cases.

We generally recommend that `touca::post` be called every time the code under
test is executed for a given test case. This practice ensures real-time feedback
about the test results, as they are being executed.

## Storing Test Results

We can choose to store captured test results and performance benchmarks for one
or more of our declared test cases on the local filesystem for further
processing or later submission to the Touca server.

```cpp
touca::save_binary("touca_" + username + ".bin");
touca::save_json("touca_" + username + ".json");
```

We can store captured data in JSON or binary format using `touca::save_json` or
`touca::save_binary` respectively. While JSON files are preferable for quick
inspections, only binary files may be posted to the Touca server at a later
time.

## Forgetting Test Cases

If you are submitted thousands of test cases for each version of your workflow
and capture significant amount of information for each test case, you can use
`touca::forget_testcase` to release all the captured information from process
memory, when you are done with a given test case.

```cpp
touca::forget_testcase();
```

## Sealing Test Results

When all the test cases are executed for a given version of our code under test,
we have the option to seal the version to let the server know that no further
test result is expected to be submitted for it. This allows the server to send
the final comparison result report to interested users, as soon as it is
available.

```cpp
touca::seal();
```

Sealing the version is optional. The Touca server automatically performs this
operation once a certain amount of time has passed since the last test case was
submitted.

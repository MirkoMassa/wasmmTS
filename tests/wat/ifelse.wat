(module
    (export "test" (func $test))
    (func $dummy)
    (func $dummy2)
    (func $test (param $in i32) (result i32)
        local.get $in ;;"boolean" check for the if

        (if (result i32 i32)
            (then
                i32.const 1
                i32.const 5
            )
            (else
                i32.const 4
                i32.const 6
            )
        )
        i32.add
        return
    )
)
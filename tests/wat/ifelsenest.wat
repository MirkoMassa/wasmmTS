(module
    (export "testnest" (func $testnest))
    (func $testnest (param $one i32) (param $two i32) (result i32)
        local.get $one ;;"boolean" check for the if

        (if (result i32 i32)
        (then
            local.get $two
            (if (result i32)
            (then
                i32.const 4
            )
            (else
                i32.const 2
            )
            )
        i32.const 7
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
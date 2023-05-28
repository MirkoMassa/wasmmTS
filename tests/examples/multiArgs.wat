(module
    (export "sumMultiArgs" (func $sumMultiArgs))
    (export "conditionMultiArgs" (func $conditionMultiArgs))

    (func $sumMultiArgs (param $n1 i32) (param $n2 i32)(result i32)
        local.get $n1
        local.get $n2
        i32.add
        return
    )
    (func $conditionMultiArgs 
    (param $bool i32) 
    (param $iftruenum i32)
    (param $iffalsenum i32)
    (result i32)

        local.get $bool
        (if (result i32) 
            (then
                local.get $iftruenum
            )
            (else
                local.get $iffalsenum
            )
        )
        i32.const 10
        i32.add 
    return
    )
)
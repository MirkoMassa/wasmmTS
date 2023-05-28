(module
    (export "sum" (func $sum))

    (func $sum (result i32)
        i32.const 5
        i32.const 5
        i32.add
        return
    )
)
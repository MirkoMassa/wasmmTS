(module
    (func $sum (param $x i32) (param $y i32) (result i32)
        local.get $x
        local.get $y
        i32.add
        return
    )
    (export "sum" (func $sum))
)
(module
    (func $sum (param $x i32) (param $y i32) (local $z i32) (result i32)
        local.get $x
        local.get $y
        i32.add
        i32.const 7
        local.set $z
        i32.add
        return
    )
    (func $begin (result i32)
        i32.const 3
        i32.const 10
        call $sum
        return
    )
    (start $begin)
)
(module
    (export "main" (func $main))
    (memory (export "memory") 1)
    (func $add (param $a i32) (param $b i32) (result i32)
        local.get $a
        local.get $b
        i32.add
        return
    )
    (func $main (param $in i32) (result i32)
        i32.const 20
        i32.const 10
        call $add
        local.get $in
        i32.add
        return
    )
)
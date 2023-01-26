(module
    ;; (import "module_name" "function_name" (func ...))
    (import "simpletest" "sum" (func $simpletest/sum (param i32 i32) (result i32)))

    (func $ciaoo (param $x i32) (result i32)
        i32.const 3
        local.get $x
        i32.add
        return
    )
    (func $hello (result i32)
        i32.const 2
        i32.const 5

        call $simpletest/sum
        return
    )
    (func $multi (param $x i32) (param $y i32) (param $z i32) (param $i i32)
    )
)
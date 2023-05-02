;; Test table section structure
(module
    (export "callboth" (func $callboth))
    (table 4 funcref)
    (elem (i32.const 0)
        $example1
        $example2
    )

    (func $example1 (result i32)
        i32.const 25
        i32.const 17
        i32.add
        return
    )
    (func $example2 (result i32)
        i32.const 20
        i32.const 10
        i32.add
        return
    )
    (func $callboth (param $index i32) (result i32)
        ;; call example1 when odd, example2 when even
        local.get $index
        i32.const 2
        i32.rem_u
        (if (result i32)
         (then
            i32.const 1
            call_indirect (result i32)
         )
         (else
            i32.const 0
            call_indirect (result i32)
         )
        )
        return
    )
)
(module
    (export "callboth" (func $callboth))
    (type $resi32 (func (result i32)))
    (type $parami32resi32 (func (param i32) (result i32)))
    (table $tab1 4 funcref)
    (table $tab2 7 funcref)
    (elem (table $tab1) (i32.const 0)
        $example1
        $example2
    )
    (elem (table $tab2) (i32.const 0)
        $example2
    )

    (elem (table $tab2) (i32.const 3)
        $example2
        $example1
        
    )
    (func $example1 (result i32)
        i32.const 25
        i32.const 17
        i32.add
        return
    )
    (func $example2 (param i32) (result i32)
        i32.const 20
        i32.const 10
        i32.add
        i32.const 5
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
            (call_indirect (type $resi32) (i32.const 0))
         )
         (else
            local.get $index
            i32.const 0
            call_indirect $tab2 (type $parami32resi32)
         )
        )
        return
    )
)
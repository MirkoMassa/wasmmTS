(module 
    (func $alotoflocals (param $n i32) (result i32) (local $prev i32) (local $next i32) (local $ff f32) (local $fff f32) (local $i i32)
        i32.const 0
        local.set $prev
        i32.const 1
        local.set $next
        i32.const 0
        local.set $i
        loop $while-continue
            local.get $i
            local.get $n
            i32.lt_s
            if
                ;;changing prev and next values
                local.get $prev
                local.get $next
                i32.add
                local.get $next
                local.set $prev
                
                local.set $next
            
                local.get $i
                i32.const 1
                i32.add
                local.set $i
                br $while-continue
            end
        end
        local.get $next 
        return
    )
)
    
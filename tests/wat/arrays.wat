(module
    ;; ref is the type 'reference' which works like a pointer
    ;; null is like 0, but with type ref instead of i32

    ;; (global $nullpointer i32)
    ;; i32.const 0
    ;; global.set $nullpointer

    (import "imports" "reduce_func" (func $imports/reduce_func (param i32 i32) (result i32)))
    (export "array" (func $createArr))
    (export "get" (func $get))
    (export "arr" (func $arr))
    (export "length" (func $len))
    (export "range" (func $range))
    (export "reduce" (func $reduce))
    (export "createArrTest" (func $createArrTest))
    (export "tab" (table $tb))

    (memory (export "memory") 1)
    ;; Arrays and some array recursion exercices
     ;; allocating 64KB

    ;; the first cell in memory will be an i32 with the beginning offset of available space.
    ;; the following cell will be an i32 recording the length of the array, and the remaining
    ;; cells will be the elements.

    ;; defining types
    (type $i32_=>_i32 (func (param i32) (result i32))) ;; gets an i32, returns an i32
    (type $i32_i32_=> (func (param i32 i32))) ;; gets two i32
    (type $ctType (func (param i32 i32 i32 i32) (result i32))) ;; gets an i32, returns an i32

    ;; allocate the memory and offset of the array
    (func $arr (type $i32_=>_i32) (param $length i32) (result i32)
        ;; creating a local variable called offset
        (local $offset i32)
        ;; setting $offset value to the first i32 (using load) in memory
        i32.const 0
        i32.load
        local.set $offset
        ;; getting the $offset (first element in memory) and the $length of the array, then
        ;; it stores the value of $length in the memory location pointed by $offset. 
        
        local.get $offset
        local.get $length
        i32.store
        ;; offset of available space
        ;; calculating real length in bits (each i32 is 4 bytes long)
        local.get $length
        i32.const 4
        i32.mul
        ;; adding real length to the current offset position
        local.get $offset
        i32.add
        ;; adding 4 (to account for the length of the array stored at the beginning)
        i32.const 4
        i32.add

        ;; storing the available space
        i32.const 0 ;;here
        i32.store

        ;; return value
        local.get $offset
        return
    )
    
    ;; return the array length
    (func $len (param $arr i32) (result i32)
        local.get $arr
        ;; loads the i32 value at the offset, 
        ;; because the result value of the array is offset
        i32.load
        return
    )
    ;; setters and getters
    ;; helper function to convert an index to a memory offset (just multiplying by 4)
    (func $toOffset (param $arr i32) (param $index i32) (result i32)
        local.get $index
        i32.const 4
        i32.mul
        local.get $arr
        i32.const 4
        i32.add
        i32.add
        return
    )
    ;; parameters: array, index to set, value to set in the index
    (func $set (param $arr i32) (param $index i32) (param $value i32)
        ;; getting the selected index address converted in bits ($offset func)
        local.get $arr
        local.get $index
        call $toOffset
        ;; getting the value
        local.get $value
        ;; storing the value in the selected cell
        i32.store
    )
    ;; parameters: array, index of the value to get
    ;; returns: gotten value
    (func $get (param $arr i32) (param $index i32) (result i32)
        local.get $arr
        local.get $index
        call $toOffset

        i32.load
        return
    )
    ;; create array main function
    ;; [1,2,3,4,\0] C arrays
    ;; length,[1,2,3,4] my arr here
    (func $createArrTest (type $ctType) (param $v1 i32) (param $v2 i32) (param $v3 i32) (param $v4 i32) (result i32)
        (local $arr1 i32) ;; new array
        ;; setting the initial offset
        i32.const 0
        i32.const 4
        i32.store

        ;; creating the arr1 (fixed length just for testing)
        i32.const 4
        call $arr
        local.set $arr1

        ;; filling with 4 values
        local.get $arr1
        i32.const 0
        local.get $v1
        call $set

        local.get $arr1
        i32.const 1
        local.get $v2
        call $set

        local.get $arr1
        i32.const 2
        local.get $v3
        call $set
        
        local.get $arr1
        i32.const 3
        local.get $v4
        call $set
        
        ;; getting some values
        local.get $arr1
        i32.const 2
        call $get
        return
    )
    ;;used to initialize the value
    ;; (func $initialize (param $arr i32) (param $index i32)

    ;;     local.get $arr
    ;;     local.get $index
    ;;     call $toOffset
    ;;     i32.load
    ;;     ;; global.get $nullpointer
    ;;     ;; i32.store
    ;; )
    ;; **exports**
    


    (func $createArr (param $len i32) (result i32) (local $i i32)
    
        (local $arr i32)
        i32.const 0
        i32.const 4
        i32.store

        local.get $len
        call $arr
        local.set $arr
        i32.const 0
        local.set $i
        loop $while-continue

            local.get $i
            local.get $len
            i32.lt_u
            if
                ;; initializing the array with "null" values
                local.get $arr
                local.get $i
                ;; call $initialize
                
                ;;incrementing i
                local.get $i
                i32.const 1
                i32.add
                local.set $i
                
                br $while-continue
            end
        end

        local.get $arr
        return
    
    )
    (func $rangeRecursion (param $s i32) (param $e i32) (param $count i32) (param $arr i32) (result i32)
    
        local.get $s
        local.get $e
        i32.gt_u
        if
            local.get $arr
            return ;; break of recursion
        end
        ;; return [s].concat(range(s+1, e))
        ;; $arr[count] = s;

        local.get $arr
        local.get $count
        local.get $s
        call $set

        local.get $s
        i32.const 1
        i32.add

        local.get $e

        local.get $count
        i32.const 1
        i32.add

        local.get $arr
        call $rangeRecursion
    )
    (func $range (param $s i32) (param $e i32) (result i32)

        (local $rangeLen i32)
        (local $arr i32)
        ;; length of the array
        local.get $e
        local.get $s
        i32.sub
        i32.const 1
        i32.add
        local.set $rangeLen

        local.get $rangeLen
        call $createArr

        
        local.set $arr

        local.get $s
        local.get $e
        i32.const 0
        local.get $arr

        call $rangeRecursion
        local.get $arr
        return
    )
    ;; [1,2,3.4].reduce((accum,curelem) => a+curelem, 10)
    (func $reduce (param $arr i32) (param $init i32) (result i32) 
        (local $accum i32) (local $i i32) (local $length i32)
        local.get $arr
        call $len
        local.set $length

        i32.const 0
        local.set $i
        local.get $init
        local.set $accum

        loop $while-continue

            local.get $i
            local.get $length
            i32.lt_u
            if
                local.get $arr
                local.get $i
                call $get
                local.get $accum
                
                call $imports/reduce_func
                local.set $accum

                local.get $i
                i32.const 1
                i32.add
                local.set $i
                
                br $while-continue
            end
        end
        
        local.get $accum
        return
    )
    ;; with this I am assuming the array will not take 0 as a value
    ;; (func $push (param $arr i32) (param $value i32) (result i32) (local $i i32)

    ;;     loop $while-continue

    ;;         i32.const 0
    ;;         local.get $arr
    ;;         local.get $i
    ;;         call $get
    ;;         ref.is_null
    ;;         if
    ;;             ;; initializing the array with "null" values
    ;;             local.get $arr
    ;;             local.get $i
    ;;             call $initialize
                
    ;;             ;;incrementing i
    ;;             local.get $i
    ;;             i32.const 1
    ;;             i32.add
    ;;             local.set $i
                
    ;;             br $while-continue
    ;;         end
    ;;     end
    ;; )
)
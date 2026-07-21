-- schema:   public
-- function: latest_content_pagination(ctime timestamp with time zone, cid uuid, ltime timestamp with time zone, lid uuid)
-- generated from Supabase project iewqfmkngcgayxbbnpiz (read-only mirror)

CREATE OR REPLACE FUNCTION public.latest_content_pagination(ctime timestamp with time zone, cid uuid, ltime timestamp with time zone DEFAULT NULL::timestamp with time zone, lid uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN

    -- Debugging output
    RAISE NOTICE 'Debug: cTime = %, cId = %, lTime = %, lId = %', cTime, cId, lTime, lId;


    -- If the last seen time is NULL, include the current item.
    IF lTime IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If both lTime and lId are provided:
    IF lTime IS NOT NULL AND lId IS NOT NULL THEN
        IF cTime = lTime THEN
            RETURN cId > lId;
        END IF;
        RETURN cTime < lTime;
    END IF;

    IF lTime IS NOT NULL AND lId IS NULL then
       RETURN cTime < lTime; 
    END IF;

    -- Default to FALSE if conditions are not met.
    RETURN FALSE;
END;
$function$


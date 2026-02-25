import { useEffect } from "react";
import { router } from "expo-router";

export default function PlansRedirect() {
    useEffect(() => {
        router.replace('/store');
    }, []);

    return null;
}

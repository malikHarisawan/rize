#include<iostream>

int min_jumps(int arr[], int start, int end)
{
    if(start == end)
        return 0;

    int min = INT_MAX;  // Max value of int

    for(int idx = 1; arr[start] >= idx && end >= start + idx; idx++)
    {
        int jumps = min_jumps(arr, start + idx, end) + 1;
        if(min > jumps)
            min = jumps;
    }
    return min;
}

int main()
{
    int arr[] = {4, 1, 2, 2, 2, 3, 2, 1, 4, 4};
    int lenOfArr = sizeof(arr) / sizeof(arr[0]);
    int ans = min_jumps(arr, 0, lenOfArr - 1);
    std::cout << ans << std::endl;
    return 0;
}
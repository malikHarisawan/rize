def twosum(arr , target):
    arrDict = {}

    for i , num in enumerate(arr):
        arrDict[num] = i

    for i , num in enumerate(arr):

        complement = target - num

        if complement in arrDict and arrDict[complement]!= i:
            return (i, arrDict[complement])
    
    return (0 , 0)


arr = [3,2,4,7,6,12,0,15]

t = 12

print(twosum(arr,t))
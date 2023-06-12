interface User {
    userID: string;
    name: string;
    email: string;
    password: string;
}

interface Schedule {
    scheduleID: string;
    userID: string;
    title: string;
    startDateTime: Date;
    endDateTime: Date;
    location: string;
    description: string;
}

interface Category {
    categoryID: string;
    categoryName: string;
    description: string;
}

interface WorkoutPlan {
    workoutID: string;
    userID: string;
    workoutName: string;
}

interface Exercise {
    exerciseID: string;
    exerciseName: string;
    reps: number;
    sets: number;
}

interface WorkoutPlanExercise {
    workoutID: string;
    exerciseID: string;
}

interface WorkoutSchedule {
    scheduleID: string;
    workoutID: string;
}

interface WorkoutCompletion {
    userID: string;
    workoutID: string;
    completionDate: Date;
    completionTime: string;
    workoutDone: boolean;
}

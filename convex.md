# Convex 데이터베이스 연동 및 관리 가이드 (Convex Guide)

이 문서는 실시간 반응형 백엔드 서비스인 **Convex**를 프로젝트에 연동하고, 데이터베이스를 관리하는 방법과 절차를 초보자의 눈높이에 맞춰 쉽게 설명합니다.

---

## 1. Convex란 무엇인가요?
**Convex**는 서버리스 데이터베이스, 백엔드 함수(쿼리, 뮤테이션, 액션), 실시간 동기화 기능을 하나로 묶어 제공하는 풀스택 백엔드 서비스(BaaS)입니다.
* **실시간 동기화**: 데이터베이스가 변경되면 클라이언트(웹/모바일) 화면이 자동으로 업데이트됩니다. (Socket 연결 코드를 직접 짤 필요가 없음)
* **TypeScript 우선**: 데이터 스키마와 API 쿼리가 모두 TypeScript로 강하게 타입 체킹됩니다.
* **간편한 서버리스**: 백엔드 API 서버를 직접 구축하거나 호스팅할 필요 없이 `convex/` 폴더 안의 파일들로 서버리스 함수를 정의합니다.

---

## 2. Convex 시작하기 (초기 설정)

### Step 1: Convex 패키지 설치
터미널에서 프로젝트 루트 경로로 이동한 뒤, Convex 클라이언트 패키지를 설치합니다.
```bash
# npm 사용 시
npm install convex
```

### Step 2: Convex 프로젝트 초기화 (가입 및 로그인)
아래 명령어를 실행하여 Convex 서버를 연동하고 초기화합니다.
```bash
npx convex dev
```
* **처음 실행할 때**: 브라우저 창이 열리며 Convex 계정(GitHub 등)으로 로그인을 요청합니다.
* 로그인에 성공하면, 현재 프로젝트의 Convex 백엔드 인스턴스가 클라우드에 생성되고 `.env.local` 파일에 Convex 접속 주소(`CONVEX_URL`)가 자동으로 저장됩니다.
* 이 명령어를 켜두면, `convex/` 디렉토리 안의 코드 변경사항이 로컬 저장 시 Convex 클라우드 서버에 실시간으로 배포(Sync)됩니다.

---

## 3. Convex 대시보드(Dashboard) 관리

`npx convex dev`를 실행하고 나면 터미널에 **Convex Dashboard** 링크가 출력됩니다. (직접 [Convex Dashboard](https://dashboard.convex.dev)로 접속도 가능합니다.)

### 대시보드에서 할 수 있는 일
1. **Data**: 저장된 테이블과 문서를 직접 보고, 데이터를 추가/수정/삭제할 수 있는 UI를 제공합니다.
2. **Functions**: 프로젝트에 작성한 백엔드 함수들을 목록으로 확인하고 대시보드 상에서 직접 실행(Test)해 볼 수 있습니다.
3. **Logs**: 서버리스 함수가 실행될 때 출력된 로그(`console.log`)와 에러를 확인할 수 있어 디버깅에 매우 유용합니다.

---

## 4. 데이터베이스 스키마 정의하기 (`convex/schema.ts`)

데이터가 저장될 테이블의 구조(Schema)를 정의합니다. `convex/schema.ts` 파일을 생성하여 아래와 같이 작성합니다.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 'users' 테이블 정의
  users: defineTable({
    username: v.string(),        // 문자열 타입
    email: v.string(),           // 문자열 타입
    createdAt: v.number(),       // 숫자(타임스탬프 등) 타입
    isAdmin: v.boolean(),        // 불리언 타입
  }),

  // 'tasks' 테이블 정의 (예시)
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.id("users"),       // 'users' 테이블의 특정 _id를 참조 (Foreign Key 역할)
  }),
});
```

---

## 5. 백엔드 함수 정의하기 (Query와 Mutation)

Convex는 데이터를 읽는 **Query**와 데이터를 쓰는 **Mutation** 두 가지 함수 유형을 가장 많이 사용합니다. `convex/` 폴더 내부에 자유롭게 파일을 만들어 정의합니다.

### 5.1 데이터 읽기: Query (`convex/tasks.ts`)
데이터베이스를 조회할 때 사용하며, 데이터가 바뀌면 이 함수를 부른 프론트엔드 화면도 실시간으로 다시 그려집니다.

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

// 모든 할 일 목록 가져오기
export const getTasks = query({
  args: {}, // 전달받을 매개변수가 없을 때 빈 객체
  handler: async (ctx) => {
    // db.query("테이블명").collect()로 전체 데이터 가져오기
    return await ctx.db.query("tasks").collect();
  },
});

// 특정 유저의 할 일만 필터링해서 가져오기
export const getTasksByUser = query({
  args: { userId: v.id("users") }, // 필요한 인자 정의
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});
```

### 5.2 데이터 쓰기/수정: Mutation (`convex/tasks.ts`)
데이터를 생성, 수정, 삭제(CUD)할 때는 `mutation`을 사용합니다.

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// 새로운 할 일 생성하기
export const createTask = mutation({
  args: {
    text: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      text: args.text,
      isCompleted: false,
      userId: args.userId,
    });
    return taskId; // 새로 생성된 문서의 ID 반환
  },
});

// 할 일 완료 상태 변경하기
export const toggleTask = mutation({
  args: {
    taskId: v.id("tasks"),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    // db.patch를 사용해 부분적으로 데이터 수정
    await ctx.db.patch(args.taskId, {
      isCompleted: args.isCompleted,
    });
  },
});

// 할 일 삭제하기
export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    // db.delete로 문서 삭제
    await ctx.db.delete(args.taskId);
  },
});
```

---

## 6. 클라이언트(React 및 Expo) 연동 방법

### 6.1 React Native / Expo 앱 설정 (`app/_layout.tsx` 또는 `App.tsx`)
Convex 클라이언트를 생성하고, 앱 전체를 `ConvexProvider`로 감싸줍니다.

```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";

// Convex 클라이언트 인스턴스 생성
// EXPO_PUBLIC_CONVEX_URL은 .env 또는 .env.local 파일에 설정되어 있어야 합니다.
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "홈" }} />
      </Stack>
    </ConvexProvider>
  );
}
```

### 6.2 컴포넌트에서 데이터 연동하여 사용하기
이제 화면(Component)에서 `useQuery`와 `useMutation` 훅을 사용해 Convex 데이터베이스와 소통할 수 있습니다.

```tsx
import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api"; // 자동 생성된 api 객체 임포트

export default function TaskScreen() {
  const [taskText, setTaskText] = useState("");

  // 1. 실시간 데이터 구독 (useQuery)
  // 데이터가 로딩 중일 때는 undefined가 반환됩니다.
  const tasks = useQuery(api.tasks.getTasks);
  
  // 2. 데이터 쓰기 함수 가져오기 (useMutation)
  const createTask = useMutation(api.tasks.createTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleAddTask = async () => {
    if (!taskText.trim()) return;
    try {
      // 임시 userId 설정 (예시)
      await createTask({ text: taskText, userId: "특정유저ID" as any });
      setTaskText("");
    } catch (error) {
      console.error("추가 실패:", error);
    }
  };

  if (tasks === undefined) {
    return <Text>로딩 중...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="새로운 할 일을 입력하세요"
          value={taskText}
          onChangeText={setTaskText}
        />
        <Button title="추가" onPress={handleAddTask} />
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text>{item.text}</Text>
            <Button title="삭제" onPress={() => deleteTask({ taskId: item._id })} color="red" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  inputContainer: { flexDirection: "row", marginBottom: 20 },
  input: { flex: 1, borderBottomWidth: 1, marginRight: 10, padding: 5 },
  taskItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: "#ccc" },
});
```

---

## 7. 핵심 CLI 명령어 요약

| 명령어 | 용도 | 설명 |
| :--- | :--- | :--- |
| `npx convex dev` | 로컬 개발 및 실시간 동기화 | 로컬 파일 변경 시 즉시 클라우드에 반영하며 대시보드 링크를 제공합니다. |
| `npx convex deploy` | 프로덕션 배포 | 실제 출시용 프로덕션 환경에 백엔드 함수를 배포합니다. |
| `npx convex dashboard` | 대시보드 열기 | 웹 대시보드 브라우저 창을 바로 엽니다. |

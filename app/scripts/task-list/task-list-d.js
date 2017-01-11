/**
 * @ngdoc directive
 * @name superProductivity.directive:taskList
 * @description
 * # taskList
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .directive('taskList', taskList);

  /* @ngInject */
  function taskList() {
    return {
      templateUrl: 'scripts/task-list/task-list-d.html',
      bindToController: true,
      controller: TaskListCtrl,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {
        tasks: '=',
        currentTask: '=',
        limitTo: '@',
        filter: '=',
        isTasksForToday: '@',
        isSubTasksDisabled: '@',
        allowTaskSelection: '@',
        disableDropInto: '@',
        onItemMoved: '&',
        onOrderChanged: '&',

      }
    };
  }

  /* @ngInject */
  function TaskListCtrl(Dialogs, $mdToast, $timeout, $window, Tasks, EDIT_ON_CLICK_TOGGLE_EV) {
    let vm = this;

    vm.estimateTime = (task) => {
      Dialogs('TIME_ESTIMATE', { task, isTasksForToday: vm.isTasksForToday });
    };

    vm.deleteTask = (task, $index) => {
      // create copy for undo
      let taskCopy = angular.copy(task);
      // delete
      vm.tasks.splice($index, 1);

      // show toast for undo
      let toast = $mdToast.simple()
        .textContent('You deleted "' + task.title + '"')
        .action('UNDO')
        .position('bottom');
      $mdToast.show(toast).then(function (response) {
        if (response === 'ok') {
          // re-add task on undo
          vm.tasks.splice($index, 0, taskCopy);
        }
      });
    };

    vm.dragControlListeners = {
      accept: () => {
        if (vm.disableDropInto) {
          return false;
        } else {
          // check for dupes
          //let draggedTask = sourceItemHandleScope.itemScope.task;
          //let targetTasks = destSortableScope.modelValue;
          //let possibleDuplicates = $window._.find(targetTasks, (task) => {
          //  return task.id == draggedTask.id;
          //});
          //
          //return !possibleDuplicates || possibleDuplicates.length === 0;
          return true;
        }
      },
      itemMoved: function (event) {
        if (angular.isFunction(vm.onItemMoved)) {
          vm.onItemMoved({ $event: event });
        }
      },
      orderChanged: function (event) {
        if (angular.isFunction(vm.onOrderChanged)) {
          vm.onOrderChanged({ $event: event });
        }
      },
      allowDuplicates: false,
      containment: '#board'
    };

    vm.onChangeTimeSpent = (task, val) => {
      if (vm.isTasksForToday) {
        Tasks.updateTimeSpentToday(task, val);
      }
    };

    vm.handleKeyPress = ($event, task) => {
      const USED_KEYS = [
        84,
        78,
        68,
        46,
        13,
        38,
        40
      ];

      let taskEl = $event.currentTarget || $event.srcElement || $event.originalTarget;

      // escape
      if ($event.keyCode === 27) {
        task.showEdit = false;
        task.showNotes = false;
        taskEl.focus();
      }

      // only trigger if target is li
      if ($event.target.tagName !== 'INPUT' && $event.target.tagName !== 'TEXTAREA') {

        if (USED_KEYS.indexOf($event.keyCode) > -1) {
          // don't propagate to parent task element
          $event.preventDefault();
          $event.stopPropagation();
        }

        // t
        if ($event.keyCode === 84) {
          vm.estimateTime(task);
        }
        // n
        if ($event.keyCode === 78) {
          task.showNotes = true;
        }
        // d
        if ($event.keyCode === 68) {
          task.isDone = !task.isDone;
        }
        // entf
        if ($event.keyCode === 46) {
          vm.deleteTask(task.id);
        }
        // enter
        if ($event.keyCode === 13) {
          let taskScope = angular.element($event.target).scope();
          taskScope.$broadcast(EDIT_ON_CLICK_TOGGLE_EV);
        }

        // moving items via shift+ctrl+keyUp/keyDown
        if ($event.shiftKey === true && $event.ctrlKey === true) {
          let taskIndex = $window._.findIndex(vm.tasks, (cTask) => {
            return cTask.id === task.id;
          });

          // move up
          if ($event.keyCode === 38) {
            if (taskIndex > 0) {
              vm.moveItem(vm.tasks, taskIndex, taskIndex - 1);
              // we need to manually re-add focus after timeout
              $timeout(() => {
                taskEl.focus();
              });
            }

          }
          // move down
          if ($event.keyCode === 40) {
            if (taskIndex < vm.tasks.length - 1) {
              vm.moveItem(vm.tasks, taskIndex, taskIndex + 1);
            }
          }
        }
      }
    };

    vm.addSubTask = (task, $event) => {
      if (!task.subTasks) {
        task.subTasks = [];
        // save original values for potential later re-initialization
        task.mainTaskTimeEstimate = task.timeEstimate;
        task.mainTaskTimeSpent = task.timeSpent;
      }
      let subTask = Tasks.createTask({
        title: ''
      });
      // edit title right away
      task.subTasks.push(subTask);

      // super complicated way of focusing the new element to edit it right away
      // TODO fix this super complication by using the task id instead and passing it to edit-on-click
      $timeout(() => {
        let buttonEl = $event.currentTarget || $event.srcElement || $event.originalTarget;
        buttonEl = angular.element(buttonEl);
        let taskEl = buttonEl.parent().parent().parent().parent();
        let subTaskEls = taskEl.find('li');
        let lastSubTasksEl = subTaskEls[subTaskEls.length - 1];
        let subTaskScope = angular.element(lastSubTasksEl).scope();
        subTaskScope.$broadcast(EDIT_ON_CLICK_TOGGLE_EV);
      });

      // if parent was current task, mark sub task as current now
      if (vm.currentTask && vm.currentTask.id && vm.currentTask.id === task.id) {
        vm.currentTask = subTask;
      }
    };

    vm.moveItem = (array, oldIndex, newIndex) => {
      if (newIndex >= array.length) {
        let k = newIndex - array.length;
        while ((k--) + 1) {
          array.push(undefined);
        }
      }
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
      return array; // for testing purposes
    };
  }

})();

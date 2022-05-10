window.addEventListener('load', () => {
  initDT(); // Initialize the DatatTable and window.columnNames variables
  addDarkmodeWidget();

  const repo = getRepoFromUrl();

  if (repo) {
    document.getElementById('q').value = repo;
    fetchData();
  }
});

let repoInfo = null;

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  fetchData();
});

function addDarkmodeWidget() {
  new Darkmode({ label: '🌓' }).showWidget();
}

function fetchData() {
  const repo = document.getElementById('q').value.replaceAll(' ', '');
  const re = /[-_\w]+\/[-_.\w]+/;

  const urlRepo = getRepoFromUrl();

  if (!urlRepo || urlRepo !== repo) {
    window.history.pushState('', '', `#${repo}`);
  }

  if (re.test(repo)) {
    fetchAndShow(repo);
    fetchAndShowOrigin(repo);
  } else {
    showMsg(
      'Invalid GitHub repository! Format is &lt;username&gt;/&lt;repo&gt;',
      'danger'
    );
  }
}

function updateOriginRepo(data) {
  data.repoLink = `<a href="https://github.com/${data.full_name}">Link</a>`;
  data.ownerName = `<img src="${
    data.owner.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'
  }&s=48" width="24" height="24" class="mr-2 rounded-circle" />${
    data.owner ? data.owner.login : '<strike><em>Unknown</em></strike>'
  }`;

  const rows = window.columnNamesMap.map(
    (colNM) =>
      '<dt class="col-sm-3">' +
      colNM[0] +
      '</dt><dd class="col-sm-9">' +
      data[colNM[1]] +
      '</dd>'
  );
  $('#originRepoInfo').html("<dl class='row'>" + rows.join('') + '</dl>');
}

function dataRenderer(col, data, type) {
  if (type === 'display') {
    if (col[1] === 'pushed_at') {
      return moment(data).fromNow();
    } else if (col[1] === 'size') {
      return data == repoInfo.size
        ? '<span style="color:red">' + data + '</span>'
        : data;
    } else if (col[1] === 'stargazers_count') {
      return data > 0
        ? '<span style="color:green;font-weight:bold">' + data + '</span>'
        : data;
    }
  }

  return data;
}

function updateDT(data) {
  // Remove any alerts, if any:
  if ($('.alert')) $('.alert').remove();

  // Format dataset and redraw DataTable. Use second index for key name
  const forks = [];
  for (let fork of data) {
    fork.repoLink = `<a href="https://github.com/${fork.full_name}">Link</a>`;
    fork.ownerName = `<img src="${
      fork.owner.avatar_url || 'https://avatars.githubusercontent.com/u/0?v=4'
    }&s=48" width="24" height="24" class="mr-2 rounded-circle" />${
      fork.owner ? fork.owner.login : '<strike><em>Unknown</em></strike>'
    }`;

    forks.push(fork);
  }

  const dataSet = forks.map((fork) =>
    window.columnNamesMap.map((colNM) => fork[colNM[1]])
  );
  window.forkTable.clear().rows.add(dataSet).draw();
}

function initDT() {
  // Create ordered Object with column name and mapped display name
  window.columnNamesMap = [
    // [ 'Repository', 'full_name' ],
    ['Link', 'repoLink'], // custom key
    ['Owner', 'ownerName'], // custom key
    ['Name', 'name'],
    ['Branch', 'default_branch'],
    ['Stars', 'stargazers_count'],
    ['Forks', 'forks'],
    ['Open Issues', 'open_issues_count'],
    ['Size', 'size'],
    ['Last Push', 'pushed_at'],
  ];

  // Sort by stars:
  const sortColName = 'Stars';
  const sortColumnIdx = window.columnNamesMap
    .map((pair) => pair[0])
    .indexOf(sortColName);

  // Use first index for readable column name
  // we use moment's fromNow() if we are rendering for `pushed_at`; better solution welcome
  window.forkTable = $('#forkTable').DataTable({
    columns: window.columnNamesMap.map((colNM) => {
      return {
        title: colNM[0],
        render: function (data, type) {
          return dataRenderer(colNM, data, type);
        },
      };
    }),
    order: [[sortColumnIdx, 'desc']],
    // paging: false,
    lengthMenu: [
      [25, 50, -1],
      [25, 50, 'All'],
    ],
    searchBuilder: {
      // all options at default
    },
  });
  let table = window.forkTable;
  new $.fn.dataTable.SearchBuilder(table, {});
  table.searchBuilder.container().prependTo(table.table().container());
}

function getRepoName(repo) {
  repo = repo.replace('https://github.com/', '');
  repo = repo.replace('http://github.com/', '');
  repo = repo.replace(/\.git$/, '');
  return repo;
}

function fetchAndShowOrigin(repo) {
  repo = getRepoName(repo);

  fetch(`https://api.github.com/repos/${repo}`)
    .then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then((data) => {
      repoInfo = data;
      updateOriginRepo(data);
    })
    .catch((error) => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

function fetchAndShow(repo) {
  repo = getRepoName(repo);

  fetch(
    `https://api.github.com/repos/${repo}/forks?sort=stargazers&per_page=100`
  )
    .then((response) => {
      if (!response.ok) throw Error(response.statusText);
      return response.json();
    })
    .then((data) => {
      updateDT(data);
    })
    .catch((error) => {
      const msg =
        error.toString().indexOf('Forbidden') >= 0
          ? 'Error: API Rate Limit Exceeded'
          : error;
      showMsg(`${msg}. Additional info in console`, 'danger');
      console.error(error);
    });
}

function showMsg(msg, type) {
  let alert_type = 'alert-info';

  if (type === 'danger') {
    alert_type = 'alert-danger';
  }

  document.getElementById('footer').innerHTML = '';

  document.getElementById('data-body').innerHTML = `
        <div class="alert ${alert_type} alert-dismissible fade show" role="alert">
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            ${msg}
        </div>
    `;
}

function getRepoFromUrl() {
  const urlRepo = location.hash && location.hash.slice(1);

  return urlRepo && decodeURIComponent(urlRepo);
}
